import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes/router';
import { AnalysisProvider } from './context/AnalysisContext';
import './index.css';

const App: React.FC = () => {
  return (
    <AnalysisProvider>
      <RouterProvider router={router} />
    </AnalysisProvider>
  );
};

export default App;
