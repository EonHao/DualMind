import React from 'react';
import { Modal, Typography } from 'antd';
import './ContentModal.css';

const { Paragraph } = Typography;

interface ContentModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

const ContentModal: React.FC<ContentModalProps> = ({
  visible,
  onClose,
  title,
  content,
}) => {
  return (
    <Modal
      title={title}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
      className="content-modal"
    >
      <div className="modal-content">
        <Paragraph className="content-text">
          {content}
        </Paragraph>
      </div>
    </Modal>
  );
};

export default ContentModal;
