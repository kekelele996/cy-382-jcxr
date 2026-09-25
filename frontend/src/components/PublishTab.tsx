import { Button, Card, DatePicker, Form, Input, InputNumber, Select } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { createTrip } from '../api';

interface Props {
  onCreated: () => void;
}

interface FormValues {
  destination: string;
  departDate: dayjs.Dayjs;
  days: number;
  budgetMax: number;
  transport: string;
  companionCount: number;
}

export default function PublishTab({ onCreated }: Props) {
  const [form] = Form.useForm<FormValues>();
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      await createTrip({
        ownerId: 0,
        destination: values.destination.trim(),
        departDate: values.departDate.format('YYYY-MM-DD'),
        days: values.days,
        budgetMax: values.budgetMax,
        transport: values.transport,
        companionCount: values.companionCount
      });
      form.resetFields();
      onCreated();
    } catch (err) {
      // 表单内不重复弹错，由全局交互兜底；这里给出简单提示
      window.alert(err instanceof Error ? err.message : '发布失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <Form
        form={form}
        layout="vertical"
        className="form"
        initialValues={{ destination: '大理', departDate: dayjs('2026-07-12'), days: 5, budgetMax: 5200, transport: '公共交通', companionCount: 3 }}
      >
        <Form.Item name="destination" label="目的地" rules={[{ required: true, message: '请填写目的地' }]}>
          <Input maxLength={120} />
        </Form.Item>
        <Form.Item name="departDate" label="出发时间" rules={[{ required: true, message: '请选择出发时间' }]}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="days" label="行程天数" rules={[{ required: true, message: '请填写行程天数' }]}>
          <InputNumber min={1} max={365} precision={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="budgetMax" label="预算上限（元）" rules={[{ required: true, message: '请填写预算上限' }]}>
          <InputNumber min={0} precision={2} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="transport" label="出行方式" rules={[{ required: true }]}>
          <Select options={['自驾', '公共交通', '徒步'].map(value => ({ value, label: value }))} />
        </Form.Item>
        <Form.Item name="companionCount" label="期望旅伴人数" rules={[{ required: true }]}>
          <InputNumber min={1} max={20} precision={0} style={{ width: '100%' }} />
        </Form.Item>
        <Button type="primary" loading={saving} onClick={submit}>
          发布计划
        </Button>
      </Form>
    </Card>
  );
}
