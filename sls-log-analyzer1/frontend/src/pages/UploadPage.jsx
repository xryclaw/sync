import { useState } from 'react';
import { Upload, Button, message, Card, Table, Typography } from 'antd';
import { UploadOutlined, InboxOutlined } from '@ant-design/icons';
import { uploadCSV, getSessions } from '../api';

const { Dragger } = Upload;
const { Title } = Typography;

function UploadPage() {
  const [uploading, setUploading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const response = await getSessions();
      setSessions(response.data.data);
    } catch (error) {
      message.error('加载会话列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file) => {
    setUploading(true);
    try {
      const response = await uploadCSV(file);
      message.success(response.data.message);
      loadSessions();
    } catch (error) {
      message.error(error.response?.data?.message || '上传失败');
    } finally {
      setUploading(false);
    }
    return false;
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '文件名',
      dataIndex: 'file_name',
      key: 'file_name',
    },
    {
      title: 'UID',
      dataIndex: 'uid',
      key: 'uid',
    },
    {
      title: '总日志数',
      dataIndex: 'total_logs',
      key: 'total_logs',
      width: 120,
    },
    {
      title: '错误数',
      dataIndex: 'error_count',
      key: 'error_count',
      width: 100,
    },
    {
      title: '上传时间',
      dataIndex: 'upload_time',
      key: 'upload_time',
      width: 180,
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card style={{ marginBottom: '24px' }}>
        <Title level={3}>上传 CSV 日志文件</Title>
        <Dragger
          name="file"
          accept=".csv"
          beforeUpload={handleUpload}
          showUploadList={false}
          disabled={uploading}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">仅支持 CSV 格式文件</p>
        </Dragger>
      </Card>

      <Card>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>上传历史</Title>
          <Button onClick={loadSessions} loading={loading}>
            刷新
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={sessions}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
}

export default UploadPage;
