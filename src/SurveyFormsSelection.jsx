import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './SurveyFormsSelection.css';

function SurveyFormsSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const { patientCode } = location.state || {};
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pointsLimitReached, setPointsLimitReached] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  
  console.log('SurveyFormsSelection - Current forms state:', forms);

  useEffect(() => {
    loadForms();
  }, []);

  // Calculate total points from all forms
  const calculateTotalPoints = async () => {
    try {
      // Get all questions from all forms
      const { data: questionsData, error: questionsError } = await supabase
        .from('survey_questions')
        .select('form_id');

      if (questionsError) {
        console.error('Error loading questions:', questionsError);
        return;
      }

      // Calculate total questions and points
      const totalQuestionsCount = questionsData?.length || 0;
      const totalPointsCount = totalQuestionsCount * 10; // 10 points per question

      setTotalQuestions(totalQuestionsCount);
      setTotalPoints(totalPointsCount);

      console.log('Total questions across all forms:', totalQuestionsCount);
      console.log('Total points available:', totalPointsCount);
    } catch (err) {
      console.error('Error calculating total points:', err);
    }
  };

  const loadForms = async () => {
    try {
      setLoading(true);
      console.log('Starting to load forms from database...');
      
      // No points limit - users can complete all forms
      
      // Try to load forms from database first
      console.log('Loading forms from database...');
      const { data: formsData, error: formsError } = await supabase
        .from('forms')
        .select('*')
        .order('id');

      console.log('Forms data from database:', formsData);
      console.log('Forms error:', formsError);

      if (formsError) {
        console.log('Forms table error, trying localStorage...');
        // Try localStorage first
        try {
          const savedForms = localStorage.getItem('surveyForms');
          if (savedForms) {
            const parsedForms = JSON.parse(savedForms);
            console.log('Forms from localStorage:', parsedForms);
            
            // Convert localStorage forms to display format
            const displayForms = parsedForms.map(form => {
              const formMetadata = getFormMetadata(form.id);
              return {
                id: form.id,
                title: form.name,
                description: form.description,
                icon: formMetadata.icon,
                questions: 0, // We'll load this separately
                estimatedTime: formMetadata.estimatedTime
              };
            });
            
            setForms(displayForms);
            return;
          }
        } catch (localError) {
          console.log('localStorage error:', localError);
        }
        
        console.log('Trying survey_questions table...');
        // Fallback: load from survey_questions table
        const { data: questionsData, error: questionsError } = await supabase
          .from('survey_questions')
          .select('form_id, question_text, type')
          .order('form_id');

        if (questionsError) {
          throw questionsError;
        }

        // Group questions by form_id
        const formsMap = {};
        questionsData?.forEach(question => {
          if (!formsMap[question.form_id]) {
            formsMap[question.form_id] = {
              id: question.form_id,
              questionCount: 0
            };
          }
          formsMap[question.form_id].questionCount++;
        });

        // Convert to array with metadata
        const allForms = Object.values(formsMap).map(form => {
          const formMetadata = getFormMetadata(form.id);
          return {
            id: form.id,
            title: formMetadata.title,
            description: formMetadata.description,
            icon: formMetadata.icon,
            questions: form.questionCount,
            estimatedTime: formMetadata.estimatedTime
          };
        });

        console.log('Forms from survey_questions:', allForms);
        setForms(allForms);
        return;
      }

      // Load question counts for each form
      const { data: questionsData, error: questionsError } = await supabase
        .from('survey_questions')
        .select('form_id')
        .order('form_id');

      if (questionsError) {
        throw questionsError;
      }

      // Count questions per form
      const questionCounts = {};
      questionsData?.forEach(question => {
        questionCounts[question.form_id] = (questionCounts[question.form_id] || 0) + 1;
      });

      // Create form objects with metadata from database
      const allForms = formsData?.map(form => {
        const formMetadata = getFormMetadata(form.id);
        return {
          id: form.id,
          title: form.name,
          description: form.description,
          icon: formMetadata.icon,
          questions: questionCounts[form.id] || 0,
          estimatedTime: formMetadata.estimatedTime
        };
      }) || [];

      console.log('Final forms array from database:', allForms);
      setForms(allForms);
      
      // Calculate total points after loading forms
      await calculateTotalPoints();
      
    } catch (err) {
      console.error('Error loading forms:', err);
      setError('Failed to load forms: ' + err.message);
      
      // Final fallback: show hardcoded forms
      console.log('Using hardcoded fallback forms...');
      const fallbackForms = [
        {
          id: '1',
          title: 'Hospital Services',
          description: 'Survey on general hospital services and facilities',
          icon: '🏥',
          questions: 8,
          estimatedTime: '5 minutes'
        },
        {
          id: '2',
          title: 'Staff & Care Quality',
          description: 'Evaluation of staff performance and care quality',
          icon: '👥',
          questions: 10,
          estimatedTime: '7 minutes'
        },
        {
          id: '3',
          title: 'Facilities & Environment',
          description: 'Assessment of hospital facilities and environment',
          icon: '🏢',
          questions: 6,
          estimatedTime: '4 minutes'
        },
        {
          id: '4',
          title: 'Treatment Experience',
          description: 'Personal experience with medical treatment',
          icon: '💊',
          questions: 12,
          estimatedTime: '8 minutes'
        },
        {
          id: '5',
          title: 'Doctor Consultation',
          description: 'Survey on doctor consultation and communication',
          icon: '👨‍⚕️',
          questions: 9,
          estimatedTime: '6 minutes'
        },
        {
          id: '6',
          title: 'Recovery & Follow-up',
          description: 'Experience with recovery process and follow-up care',
          icon: '🔄',
          questions: 7,
          estimatedTime: '5 minutes'
        }
      ];
      
      console.log('Setting fallback forms:', fallbackForms);
      setForms(fallbackForms);
      setError(''); // Clear error since we have fallback
    } finally {
      setLoading(false);
    }
  };

  const getFormMetadata = (formId) => {
    const formMetadata = {
      '1': {
        title: 'Hospital Services',
        description: 'Survey on general hospital services and facilities',
        icon: '🏥',
        estimatedTime: '5 minutes'
      },
      '2': {
        title: 'Staff & Care Quality',
        description: 'Evaluation of staff performance and care quality',
        icon: '👥',
        estimatedTime: '7 minutes'
      },
      '3': {
        title: 'Facilities & Environment',
        description: 'Assessment of hospital facilities and environment',
        icon: '🏢',
        estimatedTime: '4 minutes'
      },
      '4': {
        title: 'Treatment Experience',
        description: 'Personal experience with medical treatment',
        icon: '💊',
        estimatedTime: '8 minutes'
      },
      '5': {
        title: 'Doctor Consultation',
        description: 'Survey on doctor consultation and communication',
        icon: '👨‍⚕️',
        estimatedTime: '6 minutes'
      },
      '6': {
        title: 'Recovery & Follow-up',
        description: 'Experience with recovery process and follow-up care',
        icon: '🔄',
        estimatedTime: '5 minutes'
      },
      '7': {
        title: 'Hospitality',
        description: 'Hospitality services and guest experience',
        icon: '🏨',
        estimatedTime: '6 minutes'
      }
    };
    return formMetadata[formId] || {
      title: `Form ${formId}`,
      description: 'Survey form',
      icon: '📋',
      estimatedTime: '5 minutes'
    };
  };

  const handleFormSelect = (form) => {
    navigate(`/survey-questions/${form.id}`, { 
      state: { patientCode } 
    });
  };

  if (loading) {
    return (
      <div className="survey-forms-container">
        <div className="sf-medical-icons"></div>
        <div className="survey-forms-loading">
          <div className="loading-spinner"></div>
          <p>Loading forms...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="survey-forms-container">
        <div className="sf-medical-icons"></div>
        <div className="survey-forms-error">
          <h2>{pointsLimitReached ? 'Maximum Points Reached' : 'Error'}</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/survey-access')} className="btn-primary">
            Back to Survey Access
          </button>
        </div>
      </div>
    );
  }

  console.log('SurveyFormsSelection render - forms:', forms, 'loading:', loading);
  
  return (
    <div className="survey-forms-container">
      <div className="sf-medical-icons"></div>
      <div className="survey-forms-card">
        <div className="survey-forms-header">
          <button 
            onClick={() => navigate('/survey-access')} 
            className="back-button"
          >
            ← Back
          </button>
          <h1>Survey Forms</h1>
          <p>Choose from all available survey forms</p>
          <div style={{background: '#f0f0f0', padding: '10px', margin: '10px 0', borderRadius: '5px'}}>
            <strong>Debug Info:</strong> Loading: {loading.toString()}, Forms Count: {forms.length}, Error: {error || 'None'}
          </div>
        </div>

        <div className="forms-grid">
          {console.log('Rendering forms:', forms)}
          {forms.length === 0 ? (
            <div style={{padding: '20px', textAlign: 'center', background: '#f9f9f9', borderRadius: '8px'}}>
              <h3>No forms available</h3>
              <p>Loading forms from database...</p>
            </div>
          ) : (
            forms.map((form, index) => (
            <div 
              key={form.id}
              className="form-card"
              onClick={() => handleFormSelect(form)}
            >
              <div className="form-icon">{form.icon}</div>
              <div className="form-number">{index + 1}</div>
              <h3>{form.title}</h3>
              <p>{form.description}</p>
              <div className="form-meta">
                <div className="form-meta-item">
                  <span className="meta-icon">❓</span>
                  <span>{form.questions} Questions</span>
                </div>
                <div className="form-meta-item">
                  <span className="meta-icon">⏱️</span>
                  <span>{form.estimatedTime}</span>
                </div>
              </div>
              <div className="form-action">
                <span>Start Form</span>
                <span>→</span>
              </div>
            </div>
          ))
          )}
        </div>

        <div className="forms-footer">
          <p>Complete all forms to earn points!</p>
          <div className="points-info">
            <span>💎 10 points per question</span>
            <span>🏆 {totalQuestions} questions • {totalPoints} total points</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SurveyFormsSelection;
