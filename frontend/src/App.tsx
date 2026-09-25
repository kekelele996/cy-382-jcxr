import { Button, Card, Col, Layout, List, Row, Statistic, Tabs } from 'antd';
import { EnvironmentOutlined, MessageOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { fetchTrips } from './api';
import BoardTab from './components/BoardTab';
import PublishTab from './components/PublishTab';
import type { TripSummary } from './types';

const demoTrips = [
  { destination: '大理', departDate: '2026-07-12', days: 5, budget: '3500-5200', transport: '公共交通', score: 96 },
  { destination: '青海湖', departDate: '2026-08-03', days: 7, budget: '4800-6800', transport: '自驾', score: 88 }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('board');
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [tripId, setTripId] = useState<number | null>(null);
  const [memberName, setMemberName] = useState(() => localStorage.getItem('tripmatch-member') ?? '');
  const [messages, setMessages] = useState(['系统：已进入大理行程协作空间']);

  const loadTrips = () => {
    fetchTrips()
      .then(list => {
        setTrips(list);
        setTripId(current => current ?? list[0]?.id ?? null);
      })
      .catch(() => setTrips([]));
  };

  useEffect(loadTrips, []);

  useEffect(() => {
    localStorage.setItem('tripmatch-member', memberName);
  }, [memberName]);

  const send = () => {
    const socket = io('/', { path: '/socket.io' });
    socket.emit('trip-message', { tripId: tripId ?? 1, sender: memberName || '我', content: '今晚确认民宿地址', type: 'text' });
    setMessages(items => [...items, `${memberName || '我'}：今晚确认民宿地址`]);
    socket.disconnect();
  };

  return (
    <Layout className="shell">
      <Layout.Sider width={240} className="side">
        <h1>旅伴匹配</h1>
        <p>TripMatch</p>
      </Layout.Sider>
      <Layout.Content className="content">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'publish', label: '发布行程', children: <PublishTab onCreated={() => { loadTrips(); setActiveTab('board'); }} /> },
            {
              key: 'match',
              label: '智能匹配',
              children: (
                <Row gutter={16}>
                  {demoTrips.map(trip => (
                    <Col span={12} key={trip.destination}>
                      <Card title={<><EnvironmentOutlined /> {trip.destination}</>}>
                        <p>{trip.departDate} / {trip.days} 天 / {trip.transport}</p>
                        <Statistic title="匹配度" value={trip.score} suffix="%" />
                        <Button>申请加入</Button>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )
            },
            {
              key: 'board',
              label: '协作看板',
              children: (
                <BoardTab
                  trips={trips}
                  tripId={tripId}
                  onTripChange={setTripId}
                  memberName={memberName}
                  onMemberNameChange={setMemberName}
                />
              )
            },
            {
              key: 'chat',
              label: '即时沟通',
              children: (
                <Card title={<><MessageOutlined /> 行程群聊</>}>
                  <List dataSource={messages} renderItem={item => <List.Item>{item}</List.Item>} />
                  <Button onClick={send}>发送示例消息</Button>
                </Card>
              )
            }
          ]}
        />
      </Layout.Content>
    </Layout>
  );
}
