import { Form, Input, InputNumber, Modal } from 'antd';
import { useEffect } from 'react';
import type { PlanCategory, PlanItem } from '../types';

export interface EditorValue {
  dayNo?: number | null;
  title: string;
  detail?: string;
  assigneeName: string;
  estimatedCost?: number;
}

interface Props {
  category: PlanCategory;
  editing: PlanItem | null;
  defaultAssignee: string;
  saving: boolean;
  onSubmit: (value: EditorValue) => void;
  onClose: () => void;
}

const CATEGORY_TITLE: Record<PlanCategory, string> = {
  DAILY: '每日安排',
  LODGING: '住宿',
  TRANSPORT: '交通'
};

/** 新增/修改安排的弹窗；修改时初始 version 由父组件随表单提交带上 */
export default function PlanItemEditor({ category, editing, defaultAssignee, saving, onSubmit, onClose }: Props) {
  const [form] = Form.useForm<EditorValue>();

  useEffect(() => {
    form.setFieldsValue({
      dayNo: editing?.dayNo ?? undefined,
      title: editing?.title ?? '',
      detail: editing?.detail ?? '',
      assigneeName: editing?.assigneeName || defaultAssignee,
      estimatedCost: editing?.estimatedCost
    });
  }, [form, editing, defaultAssignee]);

  return (
    <Modal
      open
      destroyOnClose
      title={`${editing ? '修改' : '新增'}${CATEGORY_TITLE[category]}`}
      confirmLoading={saving}
      okText="保存"
      cancelText="取消"
      onCancel={onClose}
      onOk={() => form.validateFields().then(onSubmit)}
    >
      <Form form={form} layout="vertical" preserve={false}>
        {category === 'DAILY' && (
          <Form.Item name="dayNo" label="第几天" rules={[{ required: true, message: '请填写第几天（从 1 开始）' }]}>
            <InputNumber min={1} precision={0} style={{ width: '100%' }} placeholder="例如 2" />
          </Form.Item>
        )}
        <Form.Item name="title" label="内容" rules={[{ required: true, message: '请填写安排内容' }]}>
          <Input maxLength={160} placeholder={category === 'LODGING' ? '例如：古城南门云栖民宿' : category === 'TRANSPORT' ? '例如：高铁 昆明 → 大理' : '例如：环洱海骑行'} />
        </Form.Item>
        <Form.Item name="detail" label="备注（可选）">
          <Input.TextArea rows={2} maxLength={400} placeholder="集合时间、地址、订单号等补充信息" />
        </Form.Item>
        <Form.Item name="assigneeName" label="负责人" rules={[{ required: true, message: '请填写负责人' }]}>
          <Input maxLength={80} placeholder="负责这项安排的成员" />
        </Form.Item>
        <Form.Item name="estimatedCost" label="预计花费（元，可选）">
          <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="预计花费，计入计划总花费" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
