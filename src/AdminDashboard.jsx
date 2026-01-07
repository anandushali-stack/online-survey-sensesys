import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './AdminDashboard.css';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [analytics, setAnalytics] = useState(null);
  const [questionAnalytics, setQuestionAnalytics] = useState([]);
  const [selectedFormId, setSelectedFormId] = useState('1');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileSidebarOpen(false);
      } else {
        setSidebarCollapsed(false); // Reset collapsed state on mobile
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Redemption management states
  const [redemptionSearch, setRedemptionSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientPoints, setPatientPoints] = useState(null);
  const [redemptionType, setRedemptionType] = useState('money');
  const [redemptionAmount, setRedemptionAmount] = useState('');
  const [redemptionReason, setRedemptionReason] = useState('');
  const [conversionRate, setConversionRate] = useState(1); // 1 point = 1 rupee

  // UHID management states (integrated with redemption)
  const [newUhid, setNewUhid] = useState('');
  const [uhidUpdateStatus, setUhidUpdateStatus] = useState('');

  // Download states
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [recordLimit, setRecordLimit] = useState(50);
  const [downloadData, setDownloadData] = useState({
    redeemedPatients: [],
    formFilledUsers: [],
    registeredUsers: [],
    surveyResponses: []
  });

  // Individual user search states
  const [userSearchId, setUserSearchId] = useState('');
  const [userSearchResults, setUserSearchResults] = useState(null);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [userSearchError, setUserSearchError] = useState('');

  // Users view states
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [usersSearch, setUsersSearch] = useState('');
  const [usersPage, setUsersPage] = useState(1);
  const [usersPerPage] = useState(20);

  const [surveyForms, setSurveyForms] = useState([
    { id: '1', name: 'Hospital Services' },
    { id: '2', name: 'Staff & Care Quality' },
    { id: '3', name: 'Facilities & Environment' },
    { id: '4', name: 'Treatment Experience' },
    { id: '5', name: 'Doctor Consultation' },
    { id: '6', name: 'Recovery & Follow-up' }
  ]);

  useEffect(() => {
    loadForms();
  }, []);

  useEffect(() => {
    if (surveyForms.length > 0) {
      loadAnalytics();
    }
  }, [selectedFormId, surveyForms]);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab]);

  const loadForms = async () => {
    try {
      console.log('Loading forms from database...');

      // Try to load forms from database first
      const { data: formsData, error: formsError } = await supabase
        .from('forms')
        .select('*')
        .order('id');

      if (formsError) {
        console.log('Forms table error, trying localStorage...');
        // Fallback to localStorage if database fails
        const savedForms = localStorage.getItem('surveyForms');
        if (savedForms) {
          const parsedForms = JSON.parse(savedForms);
          console.log('Forms from localStorage:', parsedForms);
          setSurveyForms(parsedForms);
          return;
        }
        console.log('No forms found in localStorage, using default forms');
        return; // Keep default forms
      }

      if (formsData && formsData.length > 0) {
        console.log('Forms loaded from database:', formsData);
        setSurveyForms(formsData);
        // Also save to localStorage as backup
        localStorage.setItem('surveyForms', JSON.stringify(formsData));
      }
    } catch (err) {
      console.error('Error loading forms:', err);
      // Fallback to localStorage
      const savedForms = localStorage.getItem('surveyForms');
      if (savedForms) {
        const parsedForms = JSON.parse(savedForms);
        setSurveyForms(parsedForms);
      }
    }
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Load completed surveys data
      const { data: completedSurveysData, error: surveysError } = await supabase
        .from('surveys')
        .select('uhid, form_id, completed')
        .eq('completed', true);

      const { data: pointsData, error: pointsError } = await supabase
        .from('points_ledger')
        .select('*');

      if (surveysError || pointsError) {
        setError('Failed to load analytics data');
        return;
      }

      // Calculate Total Surveys: Users who completed ALL 6 forms
      const userFormCompletions = {};
      completedSurveysData?.forEach(survey => {
        const key = `${survey.uhid}-${survey.form_id}`;
        if (!userFormCompletions[survey.uhid]) {
          userFormCompletions[survey.uhid] = new Set();
        }
        userFormCompletions[survey.uhid].add(key);
      });

      // Count users who completed all forms
      const totalSurveys = Object.values(userFormCompletions).filter(forms => forms.size === surveyForms.length).length;

      // Calculate Total Forms Filled: Total number of individual forms filled
      const totalFormsFilled = completedSurveysData?.length || 0;

      const totalPointsEarned = pointsData?.reduce((sum, p) => sum + (p.points_earned || 0), 0) || 0;
      const totalPointsRedeemed = pointsData?.reduce((sum, p) => sum + (p.points_redeemed || 0), 0) || 0;

      // Calculate total discount amount in rupees
      const totalDiscountAmount = pointsData?.reduce((sum, p) => {
        if (p.money_equivalent) {
          return sum + p.money_equivalent;
        }
        return sum;
      }, 0) || 0;

      setAnalytics({
        totalSurveys,
        totalFormsFilled,
        totalPointsEarned,
        totalPointsRedeemed,
        availablePoints: totalPointsEarned - totalPointsRedeemed,
        totalDiscountAmount
      });

      // Load question-specific analytics
      const currentForm = surveyForms.find(f => f.id === selectedFormId);

      if (!currentForm) {
        console.error('Form not found for ID:', selectedFormId);
        setQuestionAnalytics([]);
        return;
      }

      const { data: responsesData, error: responsesError } = await supabase
        .from('survey_responses')
        .select(`
          question_id,
          answer,
          survey_questions!inner(question_text, form_id)
        `)
        .eq('survey_questions.form_id', selectedFormId);

      if (responsesError) {
        console.error('Error loading responses:', responsesError);
        return;
      }

      // Group responses by question
      const questionStats = {};
      responsesData?.forEach(response => {
        const qId = response.question_id;
        if (!questionStats[qId]) {
          questionStats[qId] = {
            question_text: response.survey_questions.question_text,
            responses: []
          };
        }
        questionStats[qId].responses.push(response.answer);
      });

      // Calculate analytics for each question
      const questionAnalyticsData = Object.entries(questionStats).map(([questionId, data]) => {
        const totalResponses = data.responses.length;
        const answerCounts = {};

        data.responses.forEach(answer => {
          answerCounts[answer] = (answerCounts[answer] || 0) + 1;
        });

        const answerPercentages = Object.entries(answerCounts).map(([answer, count]) => ({
          answer,
          count,
          percentage: Math.round((count / totalResponses) * 100)
        }));

        return {
          questionId,
          questionText: data.question_text,
          totalResponses,
          answerBreakdown: answerPercentages.sort((a, b) => b.count - a.count)
        };
      });

      setQuestionAnalytics(questionAnalyticsData);
    } catch (err) {
      setError('Error loading analytics: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    navigate('/admin-login');
  };

  // Sidebar hover handlers
  const handleSidebarMouseEnter = () => {
    if (!isMobile) {
      setSidebarCollapsed(false);
    }
  };

  const handleSidebarMouseLeave = () => {
    if (!isMobile) {
      setSidebarCollapsed(true);
    }
  };

  const handleSidebarToggle = () => {
    if (isMobile) {
      setMobileSidebarOpen(!mobileSidebarOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  // Download functions
  const loadDownloadData = async () => {
    try {
      setDownloadLoading(true);

      // Load redeemed patients data - get redemption records with limit
      const { data: redeemedData, error: redeemedError } = await supabase
        .from('points_ledger')
        .select(`
          patient_id,
          points_redeemed,
          redemption_type,
          redemption_reason,
          money_equivalent,
          record_at,
          patients(name, email, patient_code, mobile, hospital_uhid)
        `)
        .gt('points_redeemed', 0)
        .order('record_at', { ascending: false })
        .limit(recordLimit);

      // Load form filled users data - get completed surveys with limit
      const { data: formFilledData, error: formFilledError } = await supabase
        .from('surveys')
        .select(`
          uhid,
          form_id,
          completed,
          created_at,
          patients(name, email, patient_code, mobile, hospital_uhid)
        `)
        .eq('completed', true)
        .order('created_at', { ascending: false })
        .limit(recordLimit);

      // Load registered users data with limit

      const { data: registeredData, error: registeredError } = await supabase
        .from('patients')
        .select('uhid, name, email, patient_code, mobile, hospital_uhid, created_at')
        .order('created_at', { ascending: false })

        .limit(recordLimit);

      // Load survey responses data with limit
      const { data: responsesData, error: responsesError } = await supabase
        .from('survey_responses')
        .select(`
          answer,
          answered_at,
          survey_id,
          question_id,
          surveys!inner(uhid, form_id, patients(name, email, patient_code)),
          survey_questions(question_text, form_id)
        `)
        .order('answered_at', { ascending: false })
        .limit(recordLimit);

      console.log('Download data loaded:', {
        redeemed: redeemedData?.length || 0,
        formFilled: formFilledData?.length || 0,
        registered: registeredData?.length || 0,
        responses: responsesData?.length || 0
      });

      if (redeemedError) console.error('Redeemed error:', redeemedError);
      if (formFilledError) console.error('Form filled error:', formFilledError);
      if (registeredError) console.error('Registered error:', registeredError);
      if (responsesError) console.error('Responses error:', responsesError);

      const newData = {
        redeemedPatients: redeemedData || [],
        formFilledUsers: formFilledData || [],
        registeredUsers: registeredData || [],
        surveyResponses: responsesData || []
      };

      setDownloadData(newData);
      return newData;
    } catch (err) {
      console.error('Download data error:', err);
      setError('Error loading download data: ' + err.message);
      return null;
    } finally {
      setDownloadLoading(false);
    }
  };

  // Users management functions
  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      setUsersError('');

      // Load all registered users with their points data
      const { data: usersData, error: usersError } = await supabase
        .from('patients')
        .select(`
          uhid,
          name,
          email,
          patient_code,
          mobile,
          hospital_uhid,
          created_at,
          points_ledger(points_earned, points_redeemed, record_at)
        `)
        .order('created_at', { ascending: false });

      if (usersError) {
        setUsersError('Failed to load users: ' + usersError.message);
        return;
      }

      // Process users data to calculate total points
      const processedUsers = usersData.map(user => {
        const totalEarned = user.points_ledger?.reduce((sum, p) => sum + (p.points_earned || 0), 0) || 0;
        const totalRedeemed = user.points_ledger?.reduce((sum, p) => sum + (p.points_redeemed || 0), 0) || 0;
        const availablePoints = totalEarned - totalRedeemed;

        return {
          ...user,
          totalEarned,
          totalRedeemed,
          availablePoints,
          formsCompleted: user.points_ledger?.filter(p => (p.points_earned || 0) > 0).length || 0
        };
      });

      setUsers(processedUsers);
    } catch (err) {
      setUsersError('Error loading users: ' + err.message);
    } finally {
      setUsersLoading(false);
    }
  };

  const downloadPDF = async (type) => {
    try {
      setDownloadLoading(true);
      const data = await loadDownloadData();
      if (!data) return;

      console.log(`Generating PDF for ${type}, data count:`, data[type]?.length || 0);

      const doc = new jsPDF();
      const currentDate = new Date().toLocaleDateString();

      // Add title
      doc.setFontSize(20);
      doc.text(`Hospital Survey System - ${type} Report`, 20, 20);
      doc.setFontSize(12);
      doc.text(`Generated on: ${currentDate}`, 20, 30);
      doc.text(`Total Count: ${data[type]?.length || 0}`, 20, 40);

      let yPosition = 50;

      if (type === 'redeemedPatients') {
        const headers = ['Patient Name', 'Email', 'Mobile', 'Points Redeemed', 'Type', 'Reason', 'Money Equivalent', 'Date'];
        const rows = data.redeemedPatients && data.redeemedPatients.length > 0
          ? data.redeemedPatients.map(item => [
            item.patients?.name || 'N/A',
            item.patients?.email || item.patients?.patient_code || 'N/A',
            item.patients?.mobile || 'N/A',
            item.points_redeemed || 0,
            item.redemption_type || 'N/A',
            item.redemption_reason || 'N/A',
            item.money_equivalent || 0,
            new Date(item.record_at).toLocaleDateString()
          ])
          : [['No data available', '', '', '', '', '', '', '']];

        autoTable(doc, {
          head: [headers],
          body: rows,
          startY: yPosition,
          styles: { fontSize: 8 }
        });
      } else if (type === 'formFilledUsers') {
        const headers = ['Patient Name', 'Email', 'Mobile', 'Form ID', 'Completed Date'];
        const rows = data.formFilledUsers && data.formFilledUsers.length > 0
          ? data.formFilledUsers.map(item => [
            item.patients?.name || 'N/A',
            item.patients?.email || item.patients?.patient_code || 'N/A',
            item.patients?.mobile || 'N/A',
            item.form_id || 'N/A',
            new Date(item.created_at).toLocaleDateString()
          ])
          : [['No data available', '', '', '', '']];

        autoTable(doc, {
          head: [headers],
          body: rows,
          startY: yPosition,
          styles: { fontSize: 8 }
        });
      } else if (type === 'registeredUsers') {
        const headers = ['Patient Name', 'Email', 'Mobile', 'Hospital UHID', 'Registration Date'];
        const rows = data.registeredUsers && data.registeredUsers.length > 0
          ? data.registeredUsers.map(item => [
            item.name || 'N/A',
            item.email || item.patient_code || 'N/A',
            item.mobile || 'N/A',
            item.hospital_uhid || 'N/A',
            new Date(item.created_at).toLocaleDateString()
          ])
          : [['No data available', '', '', '', '']];

        autoTable(doc, {
          head: [headers],
          body: rows,
          startY: yPosition,
          styles: { fontSize: 8 }
        });
      } else if (type === 'surveyResponses') {
        const headers = ['Patient Name', 'Email', 'Question', 'Answer', 'Form ID', 'Date'];
        const rows = data.surveyResponses && data.surveyResponses.length > 0
          ? data.surveyResponses.map(item => [
            item.surveys?.patients?.name || 'N/A',
            item.surveys?.patients?.email || item.surveys?.patients?.patient_code || 'N/A',
            item.survey_questions?.question_text || 'N/A',
            item.answer || 'N/A',
            item.survey_questions?.form_id || 'N/A',
            new Date(item.answered_at).toLocaleDateString()
          ])
          : [['No data available', '', '', '', '', '']];

        autoTable(doc, {
          head: [headers],
          body: rows,
          startY: yPosition,
          styles: { fontSize: 7 }
        });
      }

      const filename = `${type}_report_${currentDate.replace(/\//g, '-')}.pdf`;
      console.log('Saving PDF:', filename);
      doc.save(filename);
    } catch (err) {
      console.error('PDF generation error:', err);
      setError('Error generating PDF: ' + err.message);
    } finally {
      setDownloadLoading(false);
    }
  };

  const downloadExcel = async (type) => {
    try {
      setDownloadLoading(true);
      const dataResult = await loadDownloadData();
      if (!dataResult) return;

      let data = [];
      let filename = '';

      if (type === 'redeemedPatients') {
        data = dataResult.redeemedPatients.map(item => ({
          'Patient Name': item.patients?.name || 'N/A',
          'Email': item.patients?.email || item.patients?.patient_code || 'N/A',
          'Mobile': item.patients?.mobile || 'N/A',
          'Points Redeemed': item.points_redeemed || 0,
          'Redemption Type': item.redemption_type || 'N/A',
          'Reason': item.redemption_reason || 'N/A',
          'Money Equivalent': item.money_equivalent || 0,
          'Date': new Date(item.record_at).toLocaleDateString()
        }));
        filename = 'redeemed_patients_report';
      } else if (type === 'formFilledUsers') {
        data = dataResult.formFilledUsers.map(item => ({
          'Patient Name': item.patients?.name || 'N/A',
          'Email': item.patients?.email || item.patients?.patient_code || 'N/A',
          'Mobile': item.patients?.mobile || 'N/A',
          'Form ID': item.form_id || 'N/A',
          'Completed Date': new Date(item.created_at).toLocaleDateString()
        }));
        filename = 'form_filled_users_report';
      } else if (type === 'registeredUsers') {
        data = dataResult.registeredUsers.map(item => ({
          'Patient Name': item.name || 'N/A',
          'Email': item.email || item.patient_code || 'N/A',
          'Mobile': item.mobile || 'N/A',
          'Hospital UHID': item.hospital_uhid || 'N/A',
          'Registration Date': new Date(item.created_at).toLocaleDateString()
        }));
        filename = 'registered_users_report';
      } else if (type === 'surveyResponses') {
        data = dataResult.surveyResponses.map(item => ({
          'Patient Name': item.surveys?.patients?.name || 'N/A',
          'Email': item.surveys?.patients?.email || item.surveys?.patients?.patient_code || 'N/A',
          'Question': item.survey_questions?.question_text || 'N/A',
          'Answer': item.answer || 'N/A',
          'Form ID': item.survey_questions?.form_id || 'N/A',
          'Date': new Date(item.answered_at).toLocaleDateString()
        }));
        filename = 'survey_responses_report';
      }

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Report');

      const currentDate = new Date().toLocaleDateString().replace(/\//g, '-');
      XLSX.writeFile(wb, `${filename}_${currentDate}.xlsx`);
    } catch (err) {
      console.error('Excel generation error:', err);
      setError('Error generating Excel: ' + err.message);
    } finally {
      setDownloadLoading(false);
    }
  };

  // Individual user search and analytics
  const searchUserAnalytics = async () => {
    if (!userSearchId.trim()) {
      setUserSearchError('Please enter an Email Address');
      return;
    }

    try {
      setUserSearchLoading(true);
      setUserSearchError('');

      // Search for user by email or patient_code
      const searchTerm = userSearchId.trim();
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .or(`email.eq.${searchTerm},patient_code.eq.${searchTerm.toUpperCase()}`)
        .single();

      if (patientError || !patientData) {
        setUserSearchError('User not found with this Email/ID');
        setUserSearchResults(null);
        return;
      }

      // Get user's survey responses with question details
      console.log('Searching for user with patient_code:', userSearchId.toUpperCase());

      // First, get all surveys for this patient
      const { data: userSurveys, error: surveysError } = await supabase
        .from('surveys')
        .select('id, form_id, created_at')
        .eq('uhid', patientData.uhid);

      if (surveysError) {
        console.error('Error fetching user surveys:', surveysError);
        setUserSearchError('Error fetching survey data');
        return;
      }

      console.log('Found surveys:', userSurveys);

      // Then get responses for these surveys
      let surveyResponses = [];
      if (userSurveys && userSurveys.length > 0) {
        const surveyIds = userSurveys.map(survey => survey.id);

        const { data: responses, error: responsesError } = await supabase
          .from('survey_responses')
          .select(`
            *,
            survey_questions!inner(
              id,
              question_text,
              type,
              form_id
            )
          `)
          .in('survey_id', surveyIds)
          .order('answered_at', { ascending: false });

        if (responsesError) {
          console.error('Error fetching survey responses:', responsesError);
          setUserSearchError('Error fetching survey data');
          return;
        }

        // Combine survey data with responses
        surveyResponses = responses?.map(response => ({
          ...response,
          surveys: userSurveys.find(survey => survey.id === response.survey_id)
        })) || [];
      }

      console.log('Found survey responses:', surveyResponses);

      // Get user's form completion status
      const { data: formCompletions, error: completionError } = await supabase
        .from('patient_form_completion')
        .select('*')
        .eq('patient_id', patientData.uhid)
        .order('completed_at', { ascending: false });

      // Get user's points ledger
      const { data: pointsLedger, error: pointsError } = await supabase
        .from('points_ledger')
        .select('*')
        .eq('patient_id', patientData.uhid)
        .order('record_at', { ascending: false });

      // Get user's redemptions from points_ledger where points_redeemed > 0
      const redemptions = pointsLedger?.filter(entry => entry.points_redeemed > 0) || [];

      // Group responses by form
      const responsesByForm = {};
      surveyResponses?.forEach(response => {
        const formId = response.surveys.form_id;
        if (!responsesByForm[formId]) {
          responsesByForm[formId] = [];
        }
        responsesByForm[formId].push(response);
      });

      // Calculate analytics
      const totalQuestions = surveyResponses?.length || 0;
      const totalPoints = pointsLedger?.reduce((sum, entry) => sum + (entry.points_earned || 0), 0) || 0;
      const redeemedPoints = redemptions?.reduce((sum, redemption) => sum + (redemption.points_redeemed || 0), 0) || 0;
      const availablePoints = totalPoints - redeemedPoints;

      setUserSearchResults({
        patient: patientData,
        surveyResponses: surveyResponses || [],
        formCompletions: formCompletions || [],
        pointsLedger: pointsLedger || [],
        redemptions: redemptions || [],
        responsesByForm,
        analytics: {
          totalQuestions,
          totalPoints,
          redeemedPoints,
          availablePoints,
          formsCompleted: formCompletions?.length || 0
        }
      });

    } catch (err) {
      console.error('Error searching user analytics:', err);
      setUserSearchError('Error searching user data: ' + err.message);
    } finally {
      setUserSearchLoading(false);
    }
  };

  const downloadUserPDF = async () => {
    if (!userSearchResults) return;

    try {
      setDownloadLoading(true);

      const doc = new jsPDF();
      const currentDate = new Date().toLocaleDateString();

      // Add title
      doc.setFontSize(20);
      doc.text('Individual User Analytics Report', 20, 30);
      doc.setFontSize(12);
      doc.text(`Generated on: ${currentDate}`, 20, 40);
      doc.text(`Email: ${userSearchResults.patient.email || userSearchResults.patient.patient_code}`, 20, 50);
      doc.text(`Patient Name: ${userSearchResults.patient.name}`, 20, 60);

      let yPosition = 80;

      // Analytics Summary
      doc.setFontSize(14);
      doc.text('Analytics Summary', 20, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.text(`Total Questions Answered: ${userSearchResults.analytics.totalQuestions}`, 20, yPosition);
      yPosition += 8;
      doc.text(`Total Points Earned: ${userSearchResults.analytics.totalPoints}`, 20, yPosition);
      yPosition += 8;
      doc.text(`Points Redeemed: ${userSearchResults.analytics.redeemedPoints}`, 20, yPosition);
      yPosition += 8;
      doc.text(`Available Points: ${userSearchResults.analytics.availablePoints}`, 20, yPosition);
      yPosition += 8;
      doc.text(`Forms Completed: ${userSearchResults.analytics.formsCompleted}`, 20, yPosition);
      yPosition += 15;

      // Survey Responses by Form
      doc.setFontSize(14);
      doc.text('Survey Responses by Form', 20, yPosition);
      yPosition += 10;

      Object.entries(userSearchResults.responsesByForm).forEach(([formId, responses]) => {
        doc.setFontSize(12);
        doc.text(`Form ID: ${formId}`, 20, yPosition);
        yPosition += 8;

        responses.forEach((response, index) => {
          if (yPosition > 280) {
            doc.addPage();
            yPosition = 20;
          }

          doc.setFontSize(9);
          doc.text(`Q${index + 1}: ${response.survey_questions.question_text}`, 25, yPosition);
          yPosition += 6;
          doc.text(`A: ${response.answer}`, 30, yPosition);
          yPosition += 6;
          doc.text(`Type: ${response.survey_questions.type}`, 30, yPosition);
          yPosition += 8;
        });
        yPosition += 5;
      });

      doc.save(`user_analytics_${userSearchResults.patient.patient_code}_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (err) {
      console.error('Error generating user PDF:', err);
      setError('Error generating PDF: ' + err.message);
    } finally {
      setDownloadLoading(false);
    }
  };

  const downloadUserExcel = async () => {
    if (!userSearchResults) return;

    try {
      setDownloadLoading(true);

      // Prepare data for Excel
      const responsesData = userSearchResults.surveyResponses.map(response => ({
        'Form ID': response.surveys.form_id,
        'Question': response.survey_questions.question_text,
        'Answer': response.answer,
        'Question Type': response.survey_questions.type,
        'Response Date': new Date(response.answered_at).toLocaleDateString()
      }));

      const pointsData = userSearchResults.pointsLedger.map(entry => ({
        'Points Earned': entry.points_earned || 0,
        'Points Redeemed': entry.points_redeemed || 0,
        'Redemption Type': entry.redemption_type || 'N/A',
        'Redemption Reason': entry.redemption_reason || 'N/A',
        'Money Equivalent': entry.money_equivalent || 0,
        'Date': new Date(entry.record_at).toLocaleDateString()
      }));

      const redemptionsData = userSearchResults.redemptions.map(redemption => ({
        'Points Redeemed': redemption.points_redeemed,
        'Redemption Type': redemption.redemption_type,
        'Reason': redemption.redemption_reason,
        'Money Equivalent': redemption.money_equivalent,
        'Date': new Date(redemption.record_at).toLocaleDateString()
      }));

      // Create workbook with multiple sheets
      const wb = XLSX.utils.book_new();

      // Survey Responses sheet
      const responsesWs = XLSX.utils.json_to_sheet(responsesData);
      XLSX.utils.book_append_sheet(wb, responsesWs, 'Survey Responses');

      // Points Ledger sheet
      const pointsWs = XLSX.utils.json_to_sheet(pointsData);
      XLSX.utils.book_append_sheet(wb, pointsWs, 'Points Ledger');

      // Redemptions sheet
      const redemptionsWs = XLSX.utils.json_to_sheet(redemptionsData);
      XLSX.utils.book_append_sheet(wb, redemptionsWs, 'Redemptions');

      // Analytics Summary sheet
      const summaryData = [{
        'Patient Name': userSearchResults.patient.name,
        'Email': userSearchResults.patient.email || userSearchResults.patient.patient_code,
        'Mobile': userSearchResults.patient.mobile,
        'Total Questions': userSearchResults.analytics.totalQuestions,
        'Total Points': userSearchResults.analytics.totalPoints,
        'Redeemed Points': userSearchResults.analytics.redeemedPoints,
        'Available Points': userSearchResults.analytics.availablePoints,
        'Forms Completed': userSearchResults.analytics.formsCompleted
      }];
      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Analytics Summary');

      XLSX.writeFile(wb, `user_analytics_${userSearchResults.patient.patient_code}_${new Date().toISOString().split('T')[0]}.xlsx`);

    } catch (err) {
      console.error('Error generating user Excel:', err);
      setError('Error generating Excel: ' + err.message);
    } finally {
      setDownloadLoading(false);
    }
  };

  // Redemption management functions
  const handleSearchPatient = async () => {
    if (!redemptionSearch.trim()) {
      setError('Please enter an Email Address');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setUhidUpdateStatus('');

      // Search for patient
      const searchTerm = redemptionSearch.trim();
      console.log('Searching for patient with Email/ID:', searchTerm);

      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('uhid, name, mobile, email, patient_code, hospital_uhid')
        .or(`email.eq.${searchTerm},patient_code.eq.${searchTerm.toUpperCase()}`)
        .single();

      console.log('Search result:', { patientData, patientError });

      if (patientError || !patientData) {
        console.error('Patient search failed:', patientError);
        setError('User not found. Please check the Email Address. Error: ' + (patientError?.message || 'No data returned'));
        return;
      }

      // Get patient points
      const { data: pointsData, error: pointsError } = await supabase
        .from('points_ledger')
        .select('points_earned, points_redeemed, redemption_type, redemption_reason, record_at')
        .eq('patient_id', patientData.uhid)
        .order('record_at', { ascending: false });

      if (pointsError) {
        console.error('Points data error:', pointsError);
        setError('Failed to load patient points');
        return;
      }

      console.log('Points data for patient:', pointsData);

      const totalEarned = pointsData?.reduce((sum, p) => sum + (p.points_earned || 0), 0) || 0;
      const totalRedeemed = pointsData?.reduce((sum, p) => sum + (p.points_redeemed || 0), 0) || 0;
      const availablePoints = totalEarned - totalRedeemed;

      console.log('Calculated points:', {
        totalEarned,
        totalRedeemed,
        availablePoints,
        pointsDataLength: pointsData?.length || 0
      });

      setSelectedPatient(patientData);
      setPatientPoints({
        totalEarned,
        totalRedeemed,
        availablePoints
      });

      // Clear UHID form when searching for a new patient
      setNewUhid('');
    } catch (err) {
      setError('Error searching for patient: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUhid = async () => {
    if (!selectedPatient || !newUhid.trim()) {
      setUhidUpdateStatus('Please enter a UHID to assign');
      return;
    }

    try {
      setLoading(true);
      setUhidUpdateStatus('');

      const { error: updateError } = await supabase
        .from('patients')
        .update({ hospital_uhid: newUhid.trim() })
        .eq('uhid', selectedPatient.uhid);

      if (updateError) {
        setUhidUpdateStatus('Failed to add UHID: ' + updateError.message);
        return;
      }

      setUhidUpdateStatus('UHID added successfully!');
      setSelectedPatient({ ...selectedPatient, hospital_uhid: newUhid.trim() });
      setNewUhid('');
    } catch (err) {
      setUhidUpdateStatus('Error adding UHID: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessRedemption = async () => {
    if (!selectedPatient || !redemptionAmount || !redemptionReason) {
      setError('Please fill in all redemption details');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const amount = parseInt(redemptionAmount);
      if (isNaN(amount) || amount <= 0) {
        setError('Please enter a valid amount');
        return;
      }

      // For money redemption, check if patient has enough points to cover the amount
      if (amount > patientPoints.availablePoints) {
        setError('Insufficient points available for this amount');
        return;
      }

      // Calculate points to deduct (1 point = 1 rupee)
      const pointsToDeduct = Math.ceil(amount / conversionRate);
      const moneyEquivalent = amount;

      console.log('Processing redemption:', {
        patientId: selectedPatient.uhid,
        pointsToDeduct,
        redemptionType,
        redemptionReason,
        moneyEquivalent,
        currentAvailablePoints: patientPoints.availablePoints
      });

      // Insert redemption record
      const { error: redemptionError } = await supabase
        .from('points_ledger')
        .insert([{
          patient_id: selectedPatient.uhid,
          points_redeemed: pointsToDeduct,
          redemption_type: redemptionType,
          redemption_reason: redemptionReason,
          money_equivalent: moneyEquivalent
        }]);

      if (redemptionError) {
        console.error('Redemption error:', redemptionError);
        setError('Failed to process redemption: ' + redemptionError.message);
        return;
      }

      console.log('Redemption record inserted successfully');

      // Refresh patient points
      console.log('Refreshing patient points...');
      await handleSearchPatient();

      setError('');
      setRedemptionAmount('');
      setRedemptionReason('');
      alert('Redemption processed successfully!');
    } catch (err) {
      console.error('Redemption processing error:', err);
      setError('Error processing redemption: ' + err.message);
    } finally {
      setLoading(false);
    }
  };


  const renderDashboard = () => (
    <div className="admin-dashboard-content">
      <div className="admin-dashboard-header">
        <h2>Dashboard Overview</h2>
        <p>Real-time analytics and insights</p>
      </div>

      {analytics && (
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 12H15M9 16H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H17C18.1046 3 19 3.89543 19 5V19C19 20.1046 18.1046 21 17 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="admin-stat-content">
              <h3>Total Surveys</h3>
              <div className="admin-stat-number">{analytics.totalSurveys}</div>
              <p>Users completed all {surveyForms.length} forms</p>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5M12 12H15M12 16H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="admin-stat-content">
              <h3>Forms Filled</h3>
              <div className="admin-stat-number">{analytics.totalFormsFilled}</div>
              <p>Total forms completed</p>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor" />
              </svg>
            </div>
            <div className="admin-stat-content">
              <h3>Points Earned</h3>
              <div className="admin-stat-number">{analytics.totalPointsEarned}</div>
              <p>Total points awarded</p>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor" />
              </svg>
            </div>
            <div className="admin-stat-content">
              <h3>Points Redeemed</h3>
              <div className="admin-stat-number">{analytics.totalPointsRedeemed}</div>
              <p>Points used by patients</p>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor" />
              </svg>
            </div>
            <div className="admin-stat-content">
              <h3>Available Points</h3>
              <div className="admin-stat-number">{analytics.availablePoints}</div>
              <p>Points in circulation</p>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 1L15.09 8.26L22 9L17 14.74L18.18 22L12 18.77L5.82 22L7 14.74L2 9L8.91 8.26L12 1Z" fill="currentColor" />
              </svg>
            </div>
            <div className="admin-stat-content">
              <h3>Total Discount</h3>
              <div className="admin-stat-number">₹{analytics.totalDiscountAmount?.toLocaleString() || 0}</div>
              <p>Amount given as discount</p>
            </div>
          </div>
        </div>
      )}

      <div className="admin-charts-section">
        <div className="admin-chart-card">
          <h3>Points Distribution</h3>
          <div className="admin-chart-content">
            <div className="admin-chart-bar">
              <div className="admin-chart-bar-label">Earned</div>
              <div className="admin-chart-bar-container">
                <div
                  className="admin-chart-bar-fill earned"
                  style={{ width: `${analytics ? (analytics.totalPointsEarned / Math.max(analytics.totalPointsEarned, 1)) * 100 : 0}%` }}
                ></div>
              </div>
              <div className="admin-chart-bar-value">{analytics?.totalPointsEarned || 0}</div>
            </div>
            <div className="admin-chart-bar">
              <div className="admin-chart-bar-label">Redeemed</div>
              <div className="admin-chart-bar-container">
                <div
                  className="admin-chart-bar-fill redeemed"
                  style={{ width: `${analytics ? (analytics.totalPointsRedeemed / Math.max(analytics.totalPointsEarned, 1)) * 100 : 0}%` }}
                ></div>
              </div>
              <div className="admin-chart-bar-value">{analytics?.totalPointsRedeemed || 0}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="admin-analytics-content">
      <div className="admin-analytics-header">
        <h2>Survey Analytics</h2>
        <p>Detailed analysis of survey responses</p>
      </div>

      <div className="admin-analytics-controls">
        <div className="admin-form-dropdown">
          <label>Select Form:</label>
          <select
            value={selectedFormId}
            onChange={(e) => setSelectedFormId(e.target.value)}
            className="admin-form-select"
          >
            {surveyForms.map(form => (
              <option key={form.id} value={form.id}>
                {form.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="admin-loading">Loading analytics...</div>
      ) : questionAnalytics.length === 0 ? (
        <div className="admin-empty-state">
          <p>No responses found for the selected form</p>
        </div>
      ) : (
        <div className="admin-question-analytics">
          {questionAnalytics.map((question, index) => (
            <div key={question.questionId} className="admin-question-card">
              <div className="admin-question-header">
                <h4>Question {index + 1}</h4>
                <span className="admin-question-responses">
                  {question.totalResponses} responses
                </span>
              </div>
              <p className="admin-question-text">{question.questionText}</p>

              <div className="admin-answer-breakdown">
                {question.answerBreakdown.map((answer, idx) => (
                  <div key={idx} className="admin-answer-item">
                    <div className="admin-answer-label">
                      <span className="admin-answer-text">{answer.answer}</span>
                      <span className="admin-answer-count">{answer.count} ({answer.percentage}%)</span>
                    </div>
                    <div className="admin-answer-bar">
                      <div
                        className="admin-answer-bar-fill"
                        style={{ width: `${answer.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderRedemptions = () => (
    <div className="admin-redemptions-content">
      <div className="admin-redemptions-header">
        <h2>Redemption & UHID Management</h2>
        <p>Search users and manage their points redemptions and UHID assignments</p>
      </div>

      {/* Patient Search Section */}
      <div className="admin-redemption-search">
        <div className="admin-search-card">
          <h3>Search Patient & UHID Management</h3>
          <p>Search users and manage their points redemptions and UHID assignments</p>


          <div className="admin-search-form">
            <input
              type="text"
              value={redemptionSearch}
              onChange={(e) => setRedemptionSearch(e.target.value)}
              placeholder="Enter Email Address"
              className="admin-search-input"
              disabled={loading}
            />
            <button
              onClick={handleSearchPatient}
              className="admin-search-button"
              disabled={loading || !redemptionSearch.trim()}
            >
              {loading ? 'Searching...' : 'Search User'}
            </button>
          </div>
          {error && <div className="admin-error">{error}</div>}
          {uhidUpdateStatus && (
            <div className={`admin-status ${uhidUpdateStatus.includes('successfully') ? 'success' : 'error'}`}>
              {uhidUpdateStatus}
            </div>
          )}
        </div>
      </div>

      {/* Patient Information */}
      {selectedPatient && patientPoints && (
        <div className="admin-patient-info">
          <div className="admin-patient-card">
            <h3>Patient Information</h3>
            <div className="admin-patient-details">
              <div className="admin-patient-item">
                <span className="admin-patient-label">Name:</span>
                <span className="admin-patient-value">{selectedPatient.name}</span>
              </div>
              <div className="admin-patient-item">
                <span className="admin-patient-label">Email:</span>
                <span className="admin-patient-value">{selectedPatient.email || selectedPatient.patient_code}</span>
              </div>
              <div className="admin-patient-item">
                <span className="admin-patient-label">Mobile:</span>
                <span className="admin-patient-value">{selectedPatient.mobile}</span>
              </div>
              <div className="admin-patient-item">
                <span className="admin-patient-label">Hospital UHID:</span>
                <span className="admin-patient-value">{selectedPatient.hospital_uhid || 'Not assigned'}</span>
              </div>
            </div>
          </div>

          <div className="admin-points-summary">
            <h3>Points Summary</h3>
            <div className="admin-points-grid">
              <div className="admin-point-card earned">
                <div className="admin-point-icon">⭐</div>
                <div className="admin-point-details">
                  <span className="admin-point-label">Total Earned</span>
                  <span className="admin-point-value">{patientPoints.totalEarned}</span>
                </div>
              </div>
              <div className="admin-point-card redeemed">
                <div className="admin-point-icon">💸</div>
                <div className="admin-point-details">
                  <span className="admin-point-label">Total Redeemed</span>
                  <span className="admin-point-value">{patientPoints.totalRedeemed}</span>
                </div>
              </div>
              <div className="admin-point-card available">
                <div className="admin-point-icon">💰</div>
                <div className="admin-point-details">
                  <span className="admin-point-label">Available Points</span>
                  <span className="admin-point-value">{patientPoints.availablePoints}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UHID Management Section */}
      {selectedPatient && !selectedPatient.hospital_uhid && (
        <div className="admin-uhid-assignment">
          <div className="admin-uhid-card">
            <h3>Assign Hospital UHID</h3>
            <p>This user doesn't have a Hospital UHID assigned. You can assign one below.</p>

            <div className="admin-uhid-form">
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Hospital UHID</label>
                  <input
                    type="text"
                    value={newUhid}
                    onChange={(e) => setNewUhid(e.target.value)}
                    placeholder="Enter Hospital UHID to assign"
                    className="admin-input"
                    disabled={loading}
                  />
                </div>
              </div>
              <button
                onClick={handleAddUhid}
                className="admin-button-primary"
                disabled={loading || !newUhid.trim()}
              >
                {loading ? 'Adding...' : 'Assign UHID'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Redemption Form */}
      {selectedPatient && patientPoints && (
        <div className="admin-redemption-form">
          <div className="admin-redemption-card">
            <h3>Process Redemption</h3>
            <div className="admin-form-row">
              <div className="admin-form-group">
                <label>Redemption Type</label>
                <div className="admin-radio-group">
                  <label className="admin-radio-label">
                    <input
                      type="radio"
                      value="money"
                      checked={redemptionType === 'money'}
                      onChange={(e) => setRedemptionType(e.target.value)}
                    />
                    Amount Redemption (₹)
                  </label>
                </div>
              </div>
            </div>

            {redemptionType === 'money' && (
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Conversion Rate (1 point = ₹1)</label>
                  <input
                    type="number"
                    value={conversionRate}
                    onChange={(e) => setConversionRate(parseFloat(e.target.value) || 1)}
                    className="admin-input"
                    min="1"
                    step="0.1"
                  />
                </div>
              </div>
            )}

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label>Amount to Redeem (₹)</label>
                <input
                  type="number"
                  value={redemptionAmount}
                  onChange={(e) => setRedemptionAmount(e.target.value)}
                  className="admin-input"
                  placeholder="Enter amount in rupees"
                  min="1"
                />
              </div>
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label>Redemption Reason</label>
                <input
                  type="text"
                  value={redemptionReason}
                  onChange={(e) => setRedemptionReason(e.target.value)}
                  className="admin-input"
                  placeholder="Enter reason for redemption"
                />
              </div>
            </div>

            {redemptionAmount && (
              <div className="admin-conversion-display">
                <p>Points to deduct: {Math.ceil(parseFloat(redemptionAmount || 0) / conversionRate)}</p>
                <p>Amount to redeem: ₹{redemptionAmount}</p>
              </div>
            )}

            <button
              onClick={handleProcessRedemption}
              className="admin-button-primary"
              disabled={loading || !redemptionAmount || !redemptionReason}
            >
              {loading ? 'Processing...' : 'Process Redemption'}
            </button>
          </div>
        </div>
      )}

    </div>
  );

  const renderForms = () => (
    <div className="admin-forms-content">
      <div className="admin-forms-iframe-container">
        <iframe
          src="/admin-forms"
          className="admin-forms-iframe"
          title="Forms Management"
        />
      </div>
    </div>
  );

  const renderUsers = () => {
    // Filter users based on search
    const filteredUsers = users.filter(user =>
      (user.name?.toLowerCase() || '').includes(usersSearch.toLowerCase()) ||
      (user.email?.toLowerCase() || '').includes(usersSearch.toLowerCase()) ||
      (user.patient_code?.toLowerCase() || '').includes(usersSearch.toLowerCase()) ||
      (user.mobile?.toString() || '').includes(usersSearch) ||
      (user.hospital_uhid?.toLowerCase() || '').includes(usersSearch.toLowerCase())
    );

    // Pagination
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
    const startIndex = (usersPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    return (
      <div className="admin-users-content">
        <div className="admin-users-header">
          <h2>Registered Users</h2>
          <p>View and manage all registered users and their points</p>
        </div>

        {/* Search and Stats */}
        <div className="admin-users-controls">
          <div className="admin-users-search">
            <input
              type="text"
              placeholder="Search users by name, email or hospital UHID..."
              value={usersSearch}
              onChange={(e) => setUsersSearch(e.target.value)}
              className="admin-input"
            />
          </div>
          <div className="admin-users-stats">
            <span>Total Users: {users.length}</span>
            <span>Filtered: {filteredUsers.length}</span>
          </div>
        </div>

        {/* Users Table */}
        {usersLoading ? (
          <div className="admin-loading">
            <div className="loading-spinner"></div>
            <p>Loading users...</p>
          </div>
        ) : usersError ? (
          <div className="admin-error">
            <p>{usersError}</p>
            <button onClick={loadUsers} className="admin-button-primary">
              Retry
            </button>
          </div>
        ) : (
          <div className="admin-users-table-container">
            <table className="admin-users-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Hospital UHID</th>
                  <th>Registered</th>
                  <th>Forms Completed</th>
                  <th>Points Earned</th>
                  <th>Points Redeemed</th>
                  <th>Available Points</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => (
                  <tr key={user.uhid}>
                    <td className="admin-table-code">{user.email || user.patient_code}</td>
                    <td className="admin-table-name">{user.name}</td>
                    <td className="admin-table-uhid">{user.hospital_uhid || '-'}</td>
                    <td className="admin-table-date">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="admin-table-forms">
                      <span className={`admin-forms-badge ${user.formsCompleted > 0 ? 'completed' : 'none'}`}>
                        {user.formsCompleted}
                      </span>
                    </td>
                    <td className="admin-table-earned">{user.totalEarned}</td>
                    <td className="admin-table-redeemed">{user.totalRedeemed}</td>
                    <td className="admin-table-available">
                      <span className={`admin-points-badge ${user.availablePoints > 0 ? 'available' : 'zero'}`}>
                        {user.availablePoints}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {paginatedUsers.length === 0 && (
              <div className="admin-empty-state">
                <p>No users found matching your search criteria.</p>
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="admin-pagination">
            <button
              onClick={() => setUsersPage(Math.max(1, usersPage - 1))}
              disabled={usersPage === 1}
              className="admin-pagination-btn"
            >
              Previous
            </button>
            <span className="admin-pagination-info">
              Page {usersPage} of {totalPages}
            </span>
            <button
              onClick={() => setUsersPage(Math.min(totalPages, usersPage + 1))}
              disabled={usersPage === totalPages}
              className="admin-pagination-btn"
            >
              Next
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderDownloads = () => (
    <div className="admin-downloads-content">
      <div className="admin-downloads-header">
        <h2>Data Downloads</h2>
        <p>Download comprehensive reports in PDF or Excel format</p>
        <div className="admin-record-limit-selector">
          <label htmlFor="recordLimit">Records to download:</label>
          <select
            id="recordLimit"
            value={recordLimit}
            onChange={(e) => setRecordLimit(parseInt(e.target.value))}
            className="admin-record-limit-select"
          >
            <option value={5}>5 records</option>
            <option value={10}>10 records</option>
            <option value={25}>25 records</option>
            <option value={50}>50 records</option>
            <option value={100}>100 records</option>
            <option value={250}>250 records</option>
            <option value={500}>500 records</option>
            <option value={1000}>1000 records</option>
          </select>
        </div>
      </div>

      <div className="admin-downloads-grid">
        {/* Redeemed Patients Card */}
        <div className="admin-download-card">
          <div className="admin-download-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor" />
            </svg>
          </div>
          <div className="admin-download-content">
            <h3>Redeemed Patients</h3>
            <p>Complete list of patients who have redeemed points with details</p>
            <div className="admin-download-actions">
              <button
                className="admin-download-btn pdf"
                onClick={() => downloadPDF('redeemedPatients')}
                disabled={downloadLoading}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                PDF
              </button>
              <button
                className="admin-download-btn excel"
                onClick={() => downloadExcel('redeemedPatients')}
                disabled={downloadLoading}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Excel
              </button>
            </div>
          </div>
        </div>

        {/* Form Filled Users Card */}
        <div className="admin-download-card">
          <div className="admin-download-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12H15M9 16H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H17C18.1046 3 19 3.89543 19 5V19C19 20.1046 18.1046 21 17 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="admin-download-content">
            <h3>Form Filled Users</h3>
            <p>Users who have completed surveys with completion details</p>
            <div className="admin-download-actions">
              <button
                className="admin-download-btn pdf"
                onClick={() => downloadPDF('formFilledUsers')}
                disabled={downloadLoading}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                PDF
              </button>
              <button
                className="admin-download-btn excel"
                onClick={() => downloadExcel('formFilledUsers')}
                disabled={downloadLoading}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Excel
              </button>
            </div>
          </div>
        </div>

        {/* Registered Users Card */}
        <div className="admin-download-card">
          <div className="admin-download-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="admin-download-content">
            <h3>Registered Users</h3>
            <p>Complete list of all registered patients in the system</p>
            <div className="admin-download-actions">
              <button
                className="admin-download-btn pdf"
                onClick={() => downloadPDF('registeredUsers')}
                disabled={downloadLoading}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                PDF
              </button>
              <button
                className="admin-download-btn excel"
                onClick={() => downloadExcel('registeredUsers')}
                disabled={downloadLoading}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Excel
              </button>
            </div>
          </div>
        </div>

        {/* Survey Responses Card */}
        <div className="admin-download-card">
          <div className="admin-download-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 3V21H21V19H5V3H3ZM7 17H9V9H7V17ZM11 17H13V5H11V17ZM15 17H17V13H15V17Z" fill="currentColor" />
            </svg>
          </div>
          <div className="admin-download-content">
            <h3>Survey Responses</h3>
            <p>Detailed survey responses with questions and answers</p>
            <div className="admin-download-actions">
              <button
                className="admin-download-btn pdf"
                onClick={() => downloadPDF('surveyResponses')}
                disabled={downloadLoading}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                PDF
              </button>
              <button
                className="admin-download-btn excel"
                onClick={() => downloadExcel('surveyResponses')}
                disabled={downloadLoading}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Excel
              </button>
            </div>
          </div>
        </div>

        {/* Individual User Analytics Card */}
        <div className="admin-download-card individual-user-card">
          <div className="admin-download-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="admin-download-content">
            <h3>Individual User Analytics</h3>
            <p>Search for a specific user by Email Address and download their detailed analytics</p>

            {/* Search Input */}
            <div className="admin-user-search-container">
              <div className="admin-user-search-input-group">
                <input
                  type="text"
                  placeholder="Enter Email Address"
                  value={userSearchId}
                  onChange={(e) => setUserSearchId(e.target.value)}
                  className="admin-user-search-input"
                />
                <button
                  onClick={searchUserAnalytics}
                  disabled={userSearchLoading || !userSearchId.trim()}
                  className="admin-user-search-btn"
                >
                  {userSearchLoading ? (
                    <div className="admin-loading-spinner-small"></div>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  Search
                </button>
              </div>

              {userSearchError && (
                <div className="admin-user-search-error">
                  {userSearchError}
                </div>
              )}
            </div>

            {/* Search Results */}
            {userSearchResults && (
              <div className="admin-user-search-results">
                <div className="admin-user-info">
                  <h4>{userSearchResults.patient.name}</h4>
                  <p>Email: {userSearchResults.patient.email || userSearchResults.patient.patient_code}</p>
                  <p>Mobile: {userSearchResults.patient.mobile}</p>
                </div>

                <div className="admin-user-analytics">
                  <div className="admin-analytics-item">
                    <span className="admin-analytics-label">Questions Answered:</span>
                    <span className="admin-analytics-value">{userSearchResults.analytics.totalQuestions}</span>
                  </div>
                  <div className="admin-analytics-item">
                    <span className="admin-analytics-label">Total Points:</span>
                    <span className="admin-analytics-value">{userSearchResults.analytics.totalPoints}</span>
                  </div>
                  <div className="admin-analytics-item">
                    <span className="admin-analytics-label">Forms Completed:</span>
                    <span className="admin-analytics-value">{userSearchResults.analytics.formsCompleted}</span>
                  </div>
                </div>

                <div className="admin-download-actions">
                  <button
                    className="admin-download-btn pdf"
                    onClick={downloadUserPDF}
                    disabled={downloadLoading}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    PDF
                  </button>
                  <button
                    className="admin-download-btn excel"
                    onClick={downloadUserExcel}
                    disabled={downloadLoading}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Excel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {downloadLoading && (
        <div className="admin-download-loading">
          <div className="admin-loading-spinner"></div>
          <p>Generating report...</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="admin-dashboard-container">
      <div className="admin-medical-icons"></div>

      {/* Mobile Overlay */}
      {isMobile && mobileSidebarOpen && (
        <div
          className="admin-sidebar-overlay"
          onClick={() => setMobileSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`admin-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileSidebarOpen ? 'mobile-open' : ''}`}
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
      >
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-brand">
            <img src="/logo.png" alt="HospSurv Logo" className="admin-sidebar-logo" />
            {!sidebarCollapsed && <h3>Admin</h3>}
          </div>
          {/* Mobile Close Button */}
          {isMobile && (
            <button
              className="admin-sidebar-close-btn"
              onClick={() => setMobileSidebarOpen(false)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>

        <nav className="admin-sidebar-nav">
          <button
            className={`admin-sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => { setActiveTab('dashboard'); if (isMobile) setMobileSidebarOpen(false); }}
            title="Dashboard"
          >
            <div className="admin-sidebar-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 13H11V3H3V13ZM3 21H11V15H3V21ZM13 21H21V11H13V21ZM13 3V9H21V3H13Z" fill="currentColor" />
              </svg>
            </div>
            {!sidebarCollapsed && <span>Dashboard</span>}
          </button>

          <button
            className={`admin-sidebar-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => { setActiveTab('analytics'); if (isMobile) setMobileSidebarOpen(false); }}
            title="Analytics"
          >
            <div className="admin-sidebar-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 3V21H21V19H5V3H3ZM7 17H9V9H7V17ZM11 17H13V5H11V17ZM15 17H17V13H15V17Z" fill="currentColor" />
              </svg>
            </div>
            {!sidebarCollapsed && <span>Analytics</span>}
          </button>

          <button
            className={`admin-sidebar-item ${activeTab === 'forms' ? 'active' : ''}`}
            onClick={() => { setActiveTab('forms'); if (isMobile) setMobileSidebarOpen(false); }}
            title="Forms"
          >
            <div className="admin-sidebar-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 12H15M9 16H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H17C18.1046 3 19 3.89543 19 5V19C19 20.1046 18.1046 21 17 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            {!sidebarCollapsed && <span>Forms</span>}
          </button>

          <button
            className={`admin-sidebar-item ${activeTab === 'redemptions' ? 'active' : ''}`}
            onClick={() => { setActiveTab('redemptions'); if (isMobile) setMobileSidebarOpen(false); }}
            title="Redemptions"
          >
            <div className="admin-sidebar-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor" />
              </svg>
            </div>
            {!sidebarCollapsed && <span>Redemptions</span>}
          </button>

          <button
            className={`admin-sidebar-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => { setActiveTab('users'); if (isMobile) setMobileSidebarOpen(false); }}
            title="Users"
          >
            <div className="admin-sidebar-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21M8.5 11C10.7091 11 12.5 9.20914 12.5 7C12.5 4.79086 10.7091 3 8.5 3C6.29086 3 4.5 4.79086 4.5 7C4.5 9.20914 6.29086 11 8.5 11ZM23 21V19C23 18.1645 22.7155 17.3541 22.2094 16.7006C21.7033 16.047 20.9991 15.5854 20.2 15.39M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89317 18.7122 8.75608 18.1676 9.45768C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            {!sidebarCollapsed && <span>Users</span>}
          </button>

          <button
            className={`admin-sidebar-item ${activeTab === 'downloads' ? 'active' : ''}`}
            onClick={() => { setActiveTab('downloads'); if (isMobile) setMobileSidebarOpen(false); }}
            title="Downloads"
          >
            <div className="admin-sidebar-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 15L8 11H10.5V3H13.5V11H16L12 15ZM4 19H20V21H4V19Z" fill="currentColor" />
              </svg>
            </div>
            {!sidebarCollapsed && <span>Downloads</span>}
          </button>
        </nav>
      </div>

      {/* Main Content with Header */}
      <div className={`admin-main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Header with Logout */}
        <div className="admin-header">
          {/* Mobile Menu Toggle */}
          {isMobile && (
            <button
              className="admin-mobile-menu-btn"
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}

          <button onClick={handleLogout} className="admin-header-logout-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9M16 17L21 12L16 7M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="logout-text">Logout</span>
          </button>
        </div>

        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'analytics' && renderAnalytics()}
        {activeTab === 'forms' && renderForms()}
        {activeTab === 'redemptions' && renderRedemptions()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'downloads' && renderDownloads()}
      </div>
    </div>
  );
}

export default AdminDashboard;
