import { App as AntdApp, Button, Card, Col, Empty, Form, Input, InputNumber, List, Modal, Row, Space, Statistic, Tag } from 'antd';
import { PlusOutlined, UserOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { api, ApiError } from '../api';
import { BoardData, BoardItem } from '../types';

interface BoardProps {
  tripId: number;
  socket: Socket;
}

interface ItemFormValues {
  dayNo: number;
  title?: string;
  lodging?: string;
  transportPlan?: string;
  ownerName: string;
  estimatedCost: number;
}

export default function Board({ tripId, socket }: BoardProps) {
  const { message, modal } = AntdApp.useApp();
  const [board, setBoard] = useState<BoardData | null>(null);
  const [editing, setEditing] = useState<BoardItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<ItemFormValues>();

  const load = useCallback(async () => {
    try {
      setBoard(await api<BoardData>(`/trips/${tripId}/board`));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '看板加载失败');
    }
  }, [tripId, message]);

  useEffect(() => {
    load();
    const onUpdated = (event: { tripId: number }) => {
      if (event.tripId === tripId) load();
    };
    socket.on('board-updated', onUpdated);
    return () => {
      socket.off('board-updated', onUpdated);
    };
  }, [load, socket, tripId]);

  const openCreate = () => {
    form.resetFields();
    setEditing(null);
    setCreating(true);
  };

  const openEdit = (item: BoardItem) => {
    form.setFieldsValue({
      dayNo: item.dayNo,
      title: item.title,
      lodging: item.lodging ?? undefined,
      transportPlan: item.transportPlan ?? undefined,
      ownerName: item.ownerName,
      estimatedCost: item.estimatedCost
    });
    setCreating(false);
    setEditing(item);
  };

  const closeModal = () => {
    setEditing(null);
    setCreating(false);
  };

  const save = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const data = editing
        ? await api<BoardData>(`/trips/${tripId}/board/items/${editing.id}`, {
            method: 'PUT',
            body: JSON.stringify({ ...values, version: editing.version })
          })
        : await api<BoardData>(`/trips/${tripId}/board/items`, { method: 'POST', body: JSON.stringify(values) });
      setBoard(data);
      closeModal();
      message.success('已保存，成员可看到最新分工和剩余预算');
      socket.emit('board-changed', { tripId });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'BOARD_CONFLICT') {
        closeModal();
        await load();
        modal.warning({
          title: '保存被拒绝',
          content: '这条安排刚被其他成员更新，看板已为你加载最新内容，请查看最新安排后再重新提交。'
        });
      } else if (error instanceof ApiError && error.code === 'BUDGET_EXCEEDED') {
        message.error(`保存被拒绝：${error.message}`);
      } else {
        message.error(error instanceof Error ? error.message : '保存失败，请稍后重试');
      }
    } finally {
      setSaving(false);
    }
  };

  const budget = board?.budget;
  const remaining = budget?.remaining ?? null;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card title={`${board?.trip.destination ?? ''} 行程预算`}>
        <Row gutter={16}>
          <Col span={8}>
            <Statistic title="行程总预算" value={budget?.budgetMax ?? '未设置'} suffix={budget?.budgetMax != null ? '元' : ''} />
          </Col>
          <Col span={8}>
            <Statistic title="已计划花费" value={budget?.planned ?? 0} suffix="元" />
          </Col>
          <Col span={8}>
            <Statistic
              title="剩余预算"
              value={remaining ?? '—'}
              suffix={remaining != null ? '元' : ''}
              valueStyle={{ color: remaining != null && remaining <= 0 ? '#cf1322' : '#3f8600' }}
            />
          </Col>
        </Row>
      </Card>
      <Card
        title="每日安排"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新增安排
          </Button>
        }
      >
        <List
          dataSource={board?.items ?? []}
          locale={{ emptyText: <Empty description="还没有安排，点击右上角新增" /> }}
          renderItem={item => (
            <List.Item actions={[<Button key="edit" onClick={() => openEdit(item)}>编辑</Button>]}>
              <List.Item.Meta
                title={
                  <Space>
                    <Tag color="blue">Day {item.dayNo}</Tag>
                    {item.title || '待补充安排'}
                  </Space>
                }
                description={
                  <Space direction="vertical" size={4}>
                    <span>
                      住宿：{item.lodging || '待补充'} ｜ 交通：{item.transportPlan || '待补充'}
                    </span>
                    <Space>
                      <Tag icon={<UserOutlined />}>{item.ownerName}</Tag>
                      <span>预计花费 ¥{item.estimatedCost}</span>
                    </Space>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Card>
      <Modal
        title={editing ? `编辑 Day ${editing.dayNo} 安排` : '新增安排'}
        open={creating || editing !== null}
        onOk={save}
        onCancel={closeModal}
        confirmLoading={saving}
        okText="保存"
        cancelText="取消"
        forceRender
      >
        <Form form={form} layout="vertical">
          <Form.Item name="dayNo" label="第几天" rules={[{ required: true, message: '请填写第几天' }]}>
            <InputNumber min={1} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="title" label="每日安排">
            <Input placeholder="例如：环洱海骑行" />
          </Form.Item>
          <Form.Item name="lodging" label="住宿">
            <Input placeholder="例如：古城南门客栈" />
          </Form.Item>
          <Form.Item name="transportPlan" label="交通方案">
            <Input placeholder="例如：租电动车环湖" />
          </Form.Item>
          <Form.Item name="ownerName" label="负责人" rules={[{ required: true, message: '请填写负责人' }]}>
            <Input placeholder="负责人昵称" />
          </Form.Item>
          <Form.Item name="estimatedCost" label="预计花费（元）" rules={[{ required: true, message: '请填写预计花费' }]}>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} prefix="¥" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
