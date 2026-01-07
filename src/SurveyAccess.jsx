import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import FormCompletionStatus from './components/FormCompletionStatus';
import './SurveyAccess.css';

function SurveyAccess() {
  const [patientCode, setPatientCode] = useState('');
  const [status, setStatus] = useState('');
  const [patientData, setPatientData] = useState(null);
  const [showFormStatus, setShowFormStatus] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const formStatusRef = useRef(null);

  // Auto-scroll when form status appears
  useEffect(() => {
    if (showFormStatus && formStatusRef.current) {
      setTimeout(() => {
        formStatusRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100); // Small delay to ensure DOM render
    }
  }, [showFormStatus]);

  // Retrieval state
  const [showRetrieve, setShowRetrieve] = useState(false);
  const [retrieveEmail, setRetrieveEmail] = useState('');
  const [retrievedCode, setRetrievedCode] = useState('');
  const [retrieveStatus, setRetrieveStatus] = useState('');
  const [retrieving, setRetrieving] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const navigate = useNavigate();

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

      // Count questions per form
      const questionsPerForm = {};
      questionsData?.forEach(question => {
        questionsPerForm[question.form_id] = (questionsPerForm[question.form_id] || 0) + 1;
      });

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

  // Load total points when component mounts
  useEffect(() => {
    calculateTotalPoints();
  }, []);

  const handleRetrieveCode = async () => {
    if (!retrieveEmail || !retrieveEmail.includes('@')) {
      setRetrieveStatus('Please enter a valid email address.');
      return;
    }

    setRetrieving(true);
    setRetrieveStatus('');
    setRetrievedCode('');

    try {
      const { data, error } = await supabase
        .from('patients')
        .select('patient_code, name')
        .eq('email', retrieveEmail.trim())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setRetrieveStatus('Email not found. Please check and try again.');
        } else {
          setRetrieveStatus('Error finding user. Please try again.');
        }
      } else if (data) {
        setRetrievedCode(data.patient_code);
        setRetrieveStatus(`Found! Hello ${data.name}.`);
      }
    } catch (err) {
      console.error('Retrieval error:', err);
      setRetrieveStatus('Network error. Please try again.');
    } finally {
      setRetrieving(false);
    }
  };

  const verifyAndProceed = async () => {
    setStatus('');
    if (!patientCode) {
      setStatus('Please enter your Email Address.');
      return;
    }

    if (patientCode.length < 3) {
      setStatus('Please enter a valid email address.');
      return;
    }

    setVerifying(true);

    try {
      const input = patientCode.trim();
      let foundUser = null;

      // 1. Try to search by Email
      const { data: emailData, error: emailError } = await supabase
        .from('patients')
        .select('uhid, name, email, patient_code')
        .eq('email', input)
        .single();

      if (emailData) {
        foundUser = emailData;
      } else {
        // 2. If not found by email, try searching by patient_code (Legacy support)
        // Only if input looks like a code (e.g., length 6, alphanumeric)
        if (input.length === 6) {
          const { data: codeData, error: codeError } = await supabase
            .from('patients')
            .select('uhid, name, email, patient_code')
            .eq('patient_code', input.toUpperCase())
            .single();

          if (codeData) {
            foundUser = codeData;
          }
        }
      }

      if (!foundUser) {
        setStatus('User not found. Please check your email and try again.');
        return;
      }

      // Store patient data and show form completion status
      setPatientData(foundUser);
      setShowFormStatus(true);
      setStatus(`Welcome back, ${foundUser.name}!`);
    } catch (e) {
      setStatus('Network error. Please check your connection and try again.');
      console.error('Survey access error:', e);
    } finally {
      setVerifying(false);
    }
  };

  const handleFormSelect = (formId) => {
    // Navigate to the specific form
    navigate(`/survey-questions/${formId}`, {
      state: {
        patientCode: patientCode.toUpperCase(),
        patientData: patientData
      }
    });
  };

  const handleNewSearch = () => {
    setPatientData(null);
    setShowFormStatus(false);
    setPatientCode('');
    setStatus('');
  };

  return (
    <div className="sa-container">
      <div className="sa-medical-icons"></div>
      <div className="sa-content fade-in">
        {/* Horizontal Layout Container */}
        <div className="sa-horizontal-layout">
          {/* Left Side - Header and Form */}
          <div className="sa-left-panel">
            <div className="sa-header">
              <div className="sa-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 className="sa-title">Survey Access</h2>
              <p className="sa-subtitle">Enter your Email Address to start earning points</p>
            </div>

            <div className="sa-form fade-in-up">
              <div className="sa-input-group">
                <label className="sa-label">Email Address</label>
                <div className="sa-input-wrapper">
                  <div className="sa-input-prefix">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z" fill="currentColor" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Enter your registered email"
                    value={patientCode}
                    onChange={e => setPatientCode(e.target.value)}
                    className="sa-input"
                  />
                </div>
                <p className="sa-input-hint">Use the email you provided during registration</p>
              </div>

              <button onClick={verifyAndProceed} className="sa-button" disabled={verifying}>
                {verifying ? (
                  <>
                    <div className="loading-spinner small"></div>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Start Survey</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8.59 16.59L13.17 12L8.59 7.41L10 6L16 12L10 18L8.59 16.59Z" fill="currentColor" />
                    </svg>
                  </>
                )}
              </button>

              {status && (
                <div className={`sa-status ${status.includes('Invalid') || status.includes('not found') || status.includes('already completed') ? 'error' : 'success'}`}>
                  <div className="sa-status-icon">
                    {status.includes('Invalid') || status.includes('not found') || status.includes('already completed') ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z" fill="currentColor" />
                      </svg>
                    )}
                  </div>
                  <span>{status}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side - Points Info */}
        <div className="sa-right-panel">
          <div className="sa-points-info fade-in-up">
            <div className="sa-points-header">
              <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', marginRight: '8px', verticalAlign: 'middle' }}>
                  <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor" />
                </svg>
                Earn Points for Your Survey!
              </h3>
              <p>Complete surveys and redeem points for hospital services</p>
              <p style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: '8px' }}>
                {totalQuestions} questions across all forms • {totalPoints} total points available
              </p>
            </div>
            <div className="sa-points-grid">
              <div className="sa-point-card">
                <div className="sa-point-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor" />
                  </svg>
                </div>
                <div className="sa-point-number">10</div>
                <div className="sa-point-text">points per question</div>
              </div>
              <div className="sa-point-card">
                <div className="sa-point-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 9L12 2L18 9L12 16L6 9Z" fill="currentColor" />
                    <path d="M12 2V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M6 9H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="sa-point-number">{totalPoints}</div>
                <div className="sa-point-text">total available</div>
              </div>
            </div>
            <div className="sa-redemption-info">
              <div className="sa-redemption-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 1V23M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6312 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6312 13.6815 18 14.5717 18 15.5C18 16.4283 17.6312 17.3185 16.9749 17.9749C16.3185 18.6312 15.4283 19 14.5 19H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="sa-redemption-note">
                Points can be redeemed for hospital services at the billing counter
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Completion Status - Full Width Below */}
      {showFormStatus && patientData && (
        <div className="sa-form-status" ref={formStatusRef}>
          <div className="sa-form-status-header">
            <h3>Available Survey Forms</h3>
            <p>Select a form to complete and earn points</p>
            <button onClick={handleNewSearch} className="sa-new-search-btn">
              Search Different User ID
            </button>
          </div>
          <FormCompletionStatus
            patientId={patientData.uhid}
            onFormSelect={handleFormSelect}
          />
        </div>
      )}
    </div>
  );
}

export default SurveyAccess;
