import React from 'react';
import AIInterviewerLayout from '../components/stitch/AIInterviewerLayout';
import LeftPanel from '../components/stitch/LeftPanel';
import ChatInterface from '../components/stitch/ChatInterface';

const StitchInterview: React.FC = () => {
    return (
        <AIInterviewerLayout>
            <LeftPanel />
            <ChatInterface />
        </AIInterviewerLayout>
    );
};

export default StitchInterview;
