import { Button, Card, Col, Empty, Input, List, Row, Space, Statistic, Tag, Typography, message } from 'antd';
import { PlusOutlined, ReloadOutlined, UserOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { ApiError, createPlanItem, fetchBoard, updatePlanItem } from '../api';
import { PLAN_CATEGORY_LABELS } from '../constants';
import type { Board, PlanCategory, PlanItem, TripSummary } from '../types';
import PlanItemEditor, { type EditorValue } from './PlanItemEditor';

interface EditorState {
  category: PlanCategory;
  item: PlanItem | null;
}

interface Props {
  trips: TripSummary[];
  tripId: number | null;
  onTripChange: (tripId: number) => void;
  memberName: string;
  onMemberNameChange: (name: string) => void;
}

export default function BoardTab({ trips, tripId, onTripChange, memberName, onMemberNameChange }: Props) {
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  // 自己刚保存成功后短时间内忽略自己触发的广播，避免重复请求和提示
  const selfSavedAtRef = useRef(0);

  const load = useCallback(async (id: number) => {
    setLoading(true);
    try {
      setBoard(await fetchBoard(id));
    } catch (err) {
      messageApi.error(err instanceof Error ? err.message : '加载看板失败');
      setBoard(null);
    } finally {
      setLoading(false);
    }
  }, [messageApi]);

  useEffect(() => {
    if (tripId !== null) load(tripId);
  }, [tripId, load]);

  // 加入该行程房间，其他成员保存成功后立刻收到推送并重取看板
  useEffect(() => {
    const socket = io('/', { path: '/socket.io' });
    const onChanged = (payload: { tripId: number; by: string; at: string }) => {
      if (payload.tripId !== tripId) return;
      if (Date.now() - selfSavedAtRef.current < 3000) return;
      messageApi.info(`${payload.by} 刚刚更新了安排，已为你刷新最新分工`);
      load(payload.tripId);
    };
    socket.on('board-changed', onChanged);
    if (tripId !== null) socket.emit('join-board', { tripId });
    return () => {
      socket.off('board-changed', onChanged);
      socket.disconnect();
    };
  }, [tripId, load, messageApi]);

  const handleSubmit = async (value: EditorValue) => {
    if (!editor || tripId === null) return;
    if (!memberName.trim()) {
      messageApi.warning('请先在右上角填写你的昵称，便于标注负责人');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        dayNo: value.dayNo ?? null,
        title: value.title.trim(),
        detail: value.detail?.trim() || undefined,
        assigneeName: value.assigneeName.trim(),
        estimatedCost: value.estimatedCost,
        operator: memberName.trim()
      };
      const next = editor.item
        ? await updatePlanItem(tripId, editor.item.id, { ...payload, version: editor.item.version })
        : await createPlanItem(tripId, { ...payload, category: editor.category });
      selfSavedAtRef.current = Date.now();
      setBoard(next);
      setEditor(null);
      messageApi.success(editor.item ? '安排已更新，其他成员可即时看到最新分工' : '安排已保存，剩余预算已更新');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VERSION_CONFLICT') {
        // 晚到的覆盖被拒绝：拉取最新看板，并把对方刚保存的内容填回弹窗供重新编辑
        messageApi.warning('该安排刚被其他成员更新，请查看下方最新安排后再重新提交');
        await load(tripId);
        const latest = err.data.latest as PlanItem | undefined;
        if (latest && editor.item) setEditor({ category: editor.category, item: latest });
      } else if (err instanceof ApiError && err.code === 'BUDGET_EXCEEDED') {
        // 超预算被拒绝：看板不变，已填内容保留，调整后可再次提交
        messageApi.error(err.message);
      } else {
        messageApi.error(err instanceof Error ? err.message : '保存失败，请重试');
      }
    } finally {
      setSaving(false);
    }
  };

  if (trips.length === 0) {
    return <Empty description="还没有行程，先到「发布行程」创建一个计划再协作吧" />;
  }

  return (
    <>
      {contextHolder}
      <Space wrap style={{ marginBottom: 16 }}>
        <select
          className="trip-select"
          value={tripId ?? undefined}
          onChange={event => onTripChange(Number(event.target.value))}
        >
          {trips.map(trip => (
            <option key={trip.id} value={trip.id}>
              {trip.destination} · {trip.departDate} · {trip.days} 天
            </option>
          ))}
        </select>
        <Input
          prefix={<UserOutlined />}
          value={memberName}
          onChange={event => onMemberNameChange(event.target.value)}
          placeholder="你的昵称（负责人署名）"
          style={{ width: 220 }}
        />
        <Button icon={<ReloadOutlined />} onClick={() => tripId !== null && load(tripId)} loading={loading}>
          刷新最新安排
        </Button>
      </Space>

      {board && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Card><Statistic title="行程总预算" value={board.totalBudget ?? '—'} suffix={board.totalBudget === undefined ? '' : '元'} /></Card>
          </Col>
          <Col span={8}>
            <Card><Statistic title="计划总花费" value={board.plannedCost} suffix="元" /></Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="剩余预算"
                value={board.remainingBudget ?? '—'}
                suffix={board.remainingBudget === undefined ? '' : '元'}
                valueStyle={(board.remainingBudget ?? 0) < 0 ? { color: '#cf1322' } : { color: '#3f8600' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Row gutter={16}>
        {(Object.keys(PLAN_CATEGORY_LABELS) as PlanCategory[]).map(category => {
          const items = board?.items.filter(item => item.category === category) ?? [];
          return (
            <Col span={8} key={category}>
              <Card
                loading={loading}
                title={PLAN_CATEGORY_LABELS[category]}
                extra={
                  <Button
                    type="link"
                    icon={<PlusOutlined />}
                    disabled={!board}
                    onClick={() => setEditor({ category, item: null })}
                  >
                    添加
                  </Button>
                }
              >
                <List
                  locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无安排，点右上角添加" /> }}
                  dataSource={items}
                  renderItem={item => (
                    <List.Item
                      actions={[
                        <a key="edit" onClick={() => setEditor({ category, item })}>
                          修改
                        </a>
                      ]}
                    >
                      <List.Item.Meta
                        title={
                          <Space size={8} wrap>
                            {item.dayNo ? <Tag color="blue">第 {item.dayNo} 天</Tag> : null}
                            <span>{item.title}</span>
                            {item.estimatedCost !== undefined && <Tag color="gold">¥{item.estimatedCost}</Tag>}
                          </Space>
                        }
                        description={
                          <Space direction="vertical" size={0}>
                            <span>
                              <UserOutlined /> 负责人：{item.assigneeName}
                              <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                                v{item.version}
                              </Typography.Text>
                            </span>
                            {item.detail && <Typography.Text type="secondary">{item.detail}</Typography.Text>}
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                              更新于 {formatTime(item.updatedAt)}
                            </Typography.Text>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          );
        })}
      </Row>

      {editor && (
        <PlanItemEditor
          key={`${editor.category}-${editor.item?.id ?? 'new'}-${editor.item?.version ?? 0}`}
          category={editor.category}
          editing={editor.item}
          defaultAssignee={memberName}
          saving={saving}
          onSubmit={handleSubmit}
          onClose={() => setEditor(null)}
        />
      )}
    </>
  );
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
