import { useState, useEffect } from 'react';
import { Table, Card, Input, Select, DatePicker, Button, Space, Modal, Typography, Tag } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { getLogs, getLogDetail, getSessions } from '../api';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title, Paragraph } = Typography;

function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });
  const [filters, setFilters] = useState({
    sessionId: undefined,
    level: undefined,
    keyword: '',
    startTime: undefined,
    endTime: undefined,
  });
  const [sessions, setSessions] = useState([]);
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentLog, setCurrentLog] = useState(null);

  useEffect(() => {
    loadSessions();
    loadLogs();
  }, []);

  const loadSessions = async () => {
    try {
      const response = await getSessions();
      setSessions(response.data.data);
    } catch (error) {
      console.error('加载会话失败', error);
    }
  };

  const loadLogs = async (page = 1, pageSize = 50) => {
    setLoading(true);
    try {
      const params = {
        ...filters,
        page,
        pageSize,
      };
      const response = await getLogs(params);
      setLogs(response.data.data.logs);
      setPagination({
        current: response.data.data.pagination.page,
        pageSize: response.data.data.pagination.pageSize,
        total: response.data.data.pagination.total,
      });
    } catch (error) {
      console.error('加载日志失败', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (newPagination) => {
    loadLogs(newPagination.current, newPagination.pageSize);
  };

  const handleSearch = () => {
    loadLogs(1, pagination.pageSize);
  };

  const handleReset = () => {
    setFilters({
      sessionId: undefined,
      level: undefined,
      keyword: '',
      startTime: undefined,
      endTime: undefined,
    });
    setTimeout(() => loadLogs(1, pagination.pageSize), 0);
  };

  const showDetail = async (record) => {
    try {
      const response = await getLogDetail(record.id);
      setCurrentLog(response.data.data);
      setDetailVisible(true);
    } catch (error) {
      console.error('加载详情失败', error);
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '时间',
      dataIndex: 'datetime',
      key: 'datetime',
      width: 180,
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      render: (level) => (
        <Tag color={level === 'Error' ? 'red' : 'blue'}>{level}</Tag>
      ),
    },
    {
      title: 'UID',
      dataIndex: 'uid',
      key: 'uid',
      width: 150,
    },
    {
      title: '响应',
      dataIndex: 'resp',
      key: 'resp',
      ellipsis: true,
    },
    {
      title: '设备',
      dataIndex: 'device',
      key: 'device',
      width: 120,
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button type="link" onClick={() => showDetail(record)}>
          详情
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card style={{ marginBottom: '16px' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Space wrap>
            <Select
              placeholder="选择会话"
              style={{ width: 200 }}
              value={filters.sessionId}
              onChange={(value) => setFilters({ ...filters, sessionId: value })}
              allowClear
            >
              {sessions.map((session) => (
                <Option key={session.id} value={session.id}>
                  {session.file_name}
                </Option>
              ))}
            </Select>
            <Select
              placeholder="日志级别"
              style={{ width: 120 }}
              value={filters.level}
              onChange={(value) => setFilters({ ...filters, level: value })}
              allowClear
            >
              <Option value="Info">Info</Option>
              <Option value="Error">Error</Option>
            </Select>
            <Input
              placeholder="关键词搜索"
              style={{ width: 200 }}
              value={filters.keyword}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
              prefix={<SearchOutlined />}
            />
            <RangePicker
              showTime
              onChange={(dates) => {
                if (dates) {
                  setFilters({
                    ...filters,
                    startTime: dates[0].format('YYYY-MM-DD HH:mm:ss'),
                    endTime: dates[1].format('YYYY-MM-DD HH:mm:ss'),
                  });
                } else {
                  setFilters({ ...filters, startTime: undefined, endTime: undefined });
                }
              }}
            />
          </Space>
          <Space>
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
              搜索
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              重置
            </Button>
          </Space>
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
        />
      </Card>

      <Modal
        title="日志详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={800}
      >
        {currentLog && (
          <div>
            <Paragraph>
              <strong>ID:</strong> {currentLog.id}
            </Paragraph>
            <Paragraph>
              <strong>时间:</strong> {currentLog.datetime}
            </Paragraph>
            <Paragraph>
              <strong>级别:</strong> <Tag color={currentLog.level === 'Error' ? 'red' : 'blue'}>{currentLog.level}</Tag>
            </Paragraph>
            <Paragraph>
              <strong>UID:</strong> {currentLog.uid}
            </Paragraph>
            <Paragraph>
              <strong>响应:</strong> {currentLog.resp}
            </Paragraph>
            <Paragraph>
              <strong>SID:</strong> {currentLog.sid}
            </Paragraph>
            <Paragraph>
              <strong>设备:</strong> {currentLog.device}
            </Paragraph>
            <Paragraph>
              <strong>客户端版本:</strong> {currentLog.client_ver}
            </Paragraph>
            <Paragraph>
              <strong>包版本:</strong> {currentLog.pack_ver}
            </Paragraph>
            <Paragraph>
              <strong>国家:</strong> {currentLog.country}
            </Paragraph>
            <Paragraph>
              <strong>商店:</strong> {currentLog.store}
            </Paragraph>
            <Title level={5}>原始 JSON:</Title>
            <pre style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px', overflow: 'auto' }}>
              {JSON.stringify(JSON.parse(currentLog.raw_json), null, 2)}
            </pre>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default LogsPage;
