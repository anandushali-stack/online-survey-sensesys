import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './FormCompletionStatus.css';

const FormCompletionStatus = ({ patientId, onFormSelect }) => {
  const [completionStatus, setCompletionStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [allForms, setAllForms] = useState([]);
  const [formQuestionCounts, setFormQuestionCounts] = useState({});

  useEffect(() => {
    if (patientId) {
      loadForms();
    }
  }, [patientId]);

  useEffect(() => {
    if (allForms.length > 0 && patientId) {
      loadCompletionStatus();
      loadQuestionCounts();
    }
  }, [allForms, patientId]);

  const loadQuestionCounts = async () => {
    try {
      console.log('Loading question counts for forms:', allForms);
      const questionCounts = {};

      // First, let's get all questions and group them by form_id
      const { data: allQuestions, error: allQuestionsError } = await supabase
        .from('survey_questions')
        .select('id, form_id');

      console.log('All questions from database:', { allQuestions, allQuestionsError });

      if (!allQuestionsError && allQuestions) {
        // Group questions by form_id
        const questionsByForm = {};
        allQuestions.forEach(question => {
          const formId = question.form_id;
          if (!questionsByForm[formId]) {
            questionsByForm[formId] = 0;
          }
          questionsByForm[formId]++;
        });

        console.log('Questions grouped by form_id:', questionsByForm);

        // Now assign counts to our forms
        for (const form of allForms) {
          questionCounts[form.formId] = questionsByForm[form.formId] || 0;
          console.log(`Form ${form.formId} (${form.name}) has ${questionCounts[form.formId]} questions`);
        }
      } else {
        // Fallback: set all to 0
        for (const form of allForms) {
          questionCounts[form.formId] = 0;
        }
        console.log('Error loading questions, setting all counts to 0');
      }

      setFormQuestionCounts(questionCounts);
      console.log('Final question counts loaded:', questionCounts);
    } catch (err) {
      console.error('Error loading question counts:', err);
      // Set all counts to 0 on error
      const questionCounts = {};
      for (const form of allForms) {
        questionCounts[form.formId] = 0;
      }
      setFormQuestionCounts(questionCounts);
    }
  };

  const loadForms = async () => {
    try {
      // Try to load from database first
      const { data: formsData, error: formsError } = await supabase
        .from('forms')
        .select('*')
        .order('id');

      if (formsError) {
        console.log('Forms table error, trying localStorage...', formsError);
        // Fallback to localStorage
        const savedForms = localStorage.getItem('surveyForms');
        if (savedForms) {
          const parsedForms = JSON.parse(savedForms);
          const displayForms = parsedForms.map(form => ({
            formId: form.id,
            name: form.name,
            description: form.description
          }));
          console.log('Loaded forms from localStorage:', displayForms);
          setAllForms(displayForms);
          return;
        }

        // Final fallback to hardcoded forms
        const fallbackForms = [
          { formId: '1', name: 'Hospital Services', description: 'Survey on general hospital services and facilities' },
          { formId: '2', name: 'Staff & Care Quality', description: 'Evaluation of staff performance and care quality' },
          { formId: '3', name: 'Facilities & Environment', description: 'Assessment of hospital facilities and environment' },
          { formId: '4', name: 'Treatment Experience', description: 'Personal experience with medical treatment' },
          { formId: '5', name: 'Doctor Consultation', description: 'Survey on doctor consultation and communication' },
          { formId: '6', name: 'Recovery & Follow-up', description: 'Experience with recovery process and follow-up care' }
        ];
        setAllForms(fallbackForms);
        return;
      }

      // Convert database forms to display format
      const displayForms = formsData?.map(form => ({
        formId: form.id,
        name: form.name,
        description: form.description
      })) || [];

      console.log('Setting forms from database:', displayForms);
      setAllForms(displayForms);
    } catch (err) {
      console.error('Error loading forms:', err);
      // Fallback to hardcoded forms
      const fallbackForms = [
        { formId: '1', name: 'Hospital Services', description: 'Survey on general hospital services and facilities' },
        { formId: '2', name: 'Staff & Care Quality', description: 'Evaluation of staff performance and care quality' },
        { formId: '3', name: 'Facilities & Environment', description: 'Assessment of hospital facilities and environment' },
        { formId: '4', name: 'Treatment Experience', description: 'Personal experience with medical treatment' },
        { formId: '5', name: 'Doctor Consultation', description: 'Survey on doctor consultation and communication' },
        { formId: '6', name: 'Recovery & Follow-up', description: 'Experience with recovery process and follow-up care' }
      ];
      console.log('Setting fallback forms:', fallbackForms);
      setAllForms(fallbackForms);
    }
  };

  const loadCompletionStatus = async () => {
    try {
      console.log('Loading completion status for forms:', allForms);
      if (allForms.length === 0) return;

      setLoading(true);

      // Get ALL completion records for this patient
      // We order by completed_at descending to easily find the latest
      let { data, error } = await supabase
        .from('patient_form_completion')
        .select('form_id, completed_at')
        .eq('patient_id', patientId)
        .order('completed_at', { ascending: false }); // Get latest first

      // Fallback to surveys table if empty (migration compatibility)
      if ((!data || data.length === 0) && !error) {
        console.log('Checking surveys table for legacy records');
        const { data: surveyData, error: surveyError } = await supabase
          .from('surveys')
          .select('form_id, created_at')
          .eq('uhid', patientId)
          .eq('completed', true)
          .order('created_at', { ascending: false });

        if (!surveyError && surveyData) {
          data = surveyData.map(s => ({
            form_id: s.form_id,
            completed_at: s.created_at
          }));
        }
      }

      if (error) {
        throw error;
      }

      // Process latest completion per form
      const status = {};
      const now = new Date();
      const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000; // Approx 6 months

      // Since we ordered by desc, the first occurrence of a form_id is the latest
      data?.forEach(completion => {
        const key = completion.form_id;
        if (!status[key]) {
          const completedAt = new Date(completion.completed_at);
          const nextAvailable = new Date(completedAt.getTime() + SIX_MONTHS_MS);
          const isBlocked = now < nextAvailable;

          status[key] = {
            completed: isBlocked, // If blocked, treat as "completed" (cannot take)
            blocked: isBlocked,
            completedAt: completion.completed_at,
            nextAvailableDate: nextAvailable
          };
        }
      });

      setCompletionStatus(status);
    } catch (err) {
      setError('Error loading completion status: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getFormStatus = (formId) => {
    return completionStatus[formId] || { completed: false, blocked: false };
  };

  const getCompletionStats = () => {
    const completed = allForms.filter(form =>
      getFormStatus(form.formId).completed // Counts as completed if blocked
    ).length;

    return {
      completed,
      total: allForms.length,
      remaining: allForms.length - completed
    };
  };

  const stats = getCompletionStats();

  if (loading) {
    return (
      <div className="form-completion-loading">
        <div className="loading-spinner"></div>
        <p>Loading form completion status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="form-completion-error">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="form-completion-container">
      <div className="form-completion-header">
        <h3>Form Completion Status</h3>
        <div className="completion-stats">
          <div className="stat-item">
            <span className="stat-number completed">{stats.completed}</span>
            <span className="stat-label">Completed</span>
          </div>
          <div className="stat-item">
            <span className="stat-number remaining">{stats.remaining}</span>
            <span className="stat-label">Remaining</span>
          </div>
          <div className="stat-item">
            <span className="stat-number total">{stats.total}</span>
            <span className="stat-label">Total Forms</span>
          </div>
        </div>
      </div>

      <div className="forms-horizontal-container">
        <div className="forms-tabs">
          {allForms.map((form, index) => {
            const status = getFormStatus(form.formId);
            const isCompleted = status.completed;

            return (
              <div
                key={form.formId}
                className={`form-tab ${isCompleted ? 'completed' : 'available'}`}
                onClick={() => !isCompleted && onFormSelect(form.formId)}
              >
                <div className="form-tab-header">
                  <div className="form-tab-icon">{form.icon}</div>
                  <div className="form-tab-number">{index + 1}</div>
                </div>

                <div className="form-tab-content">
                  <h4 className="form-tab-title">{form.name}</h4>
                  <p className="form-tab-description">{form.description}</p>

                  <div className="form-tab-meta">
                    <div className="form-tab-meta-item">
                      <span className="meta-icon">📋</span>
                      <span>{formQuestionCounts[form.formId] || 0} questions</span>
                    </div>
                    <div className="form-tab-meta-item">
                      <span className="meta-icon">⭐</span>
                      <span>{(formQuestionCounts[form.formId] || 0) * 10} points</span>
                    </div>
                    {isCompleted && status.completedAt && (
                      <div className="form-tab-meta-item full-width">
                        {status.blocked ? (
                          <>
                            <span className="meta-icon" style={{ color: '#f59e0b' }}>⏳</span>
                            <span style={{ color: '#d97706', fontSize: '0.9rem' }}>
                              You have already completed this survey. You can take it again after {new Date(status.nextAvailableDate).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="meta-icon">✅</span>
                            <span>Completed</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {!isCompleted && (
                  <div className="form-tab-action">
                    <button className="form-tab-button">
                      Start Form
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 12H19M12 5L19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {stats.completed === stats.total && (
        <div className="all-forms-completed">
          <div className="completion-celebration">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h4>Congratulations!</h4>
            <p>You have completed all available forms. Thank you for your survey!</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormCompletionStatus;
