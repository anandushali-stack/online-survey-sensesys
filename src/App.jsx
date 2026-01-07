import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Navigation from './Navigation';
import PatientForm from './PatientForm';
import SurveyAccess from './SurveyAccess';
import SurveyQuestionsNew from './SurveyQuestions';
import SurveyFormsSelection from './SurveyFormsSelection';
import SurveyComplete from './SurveyComplete';
import UserPointsView from './UserPointsView';
import AdminPanelForms from './AdminPanelForms';
import AdminDashboard from './AdminDashboard';
import SimpleAdminLogin from './SimpleAdminLogin';

function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  useEffect(() => {
    async function fetchPatients() {
      const { data, error } = await supabase.from('patients').select('*');
      console.log(data, error);
    }
    fetchPatients();
  }, []);

  return (
    <div>
      <div className="medical-icons">
        <div className="medical-shape-1"></div>
        <div className="medical-shape-2"></div>
        <div className="medical-shape-3"></div>
        <div className="medical-shape-4"></div>
        <div className="medical-shape-5"></div>
      </div>
      {!isAdminRoute && <Navigation />}
      <Routes>
        <Route path="/" element={<Navigate replace to="/register" />} />
        <Route path="/register" element={<PatientForm />} />
        <Route path="/survey-access" element={<SurveyAccess />} />
        <Route path="/survey-forms" element={<SurveyFormsSelection />} />
        <Route path="/survey-questions/:formId" element={<SurveyQuestionsNew />} />
        <Route path="/survey-complete" element={<SurveyComplete />} />
        <Route path="/my-points" element={<UserPointsView />} />
        <Route path="/admin-login" element={<SimpleAdminLogin />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin-forms" element={<AdminPanelForms />} />
      </Routes>
    </div>
  );
}

export default App;
