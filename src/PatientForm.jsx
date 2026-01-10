import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './PatientForm.css';

function generateShortId(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function PatientForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState('inputDetails'); // inputDetails, done
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');
  const [code, setCode] = useState('');
  const [patientCode, setPatientCode] = useState('');

  const [totalPoints, setTotalPoints] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);

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

  // Load total points when component mounts
  useEffect(() => {
    calculateTotalPoints();
  }, []);

  // (phone fields removed) registration uses `email` now

  // Send verification OTP (email with 6-digit code)
  const sendVerificationEmail = async () => {
    setStatus('');
    if (!email.trim() || !name.trim()) {
      setStatus('Please enter a valid email and your name.');
      return;
    }

    try {
      // 1. Check if user already exists BEFORE sending OTP
      console.log('Checking for existing user before OTP:', email);
      const { data: existingPatients, error: checkError } = await supabase
        .from('patients')
        .select('uhid')
        .eq('email', email.trim().toLowerCase())
        .limit(1);

      if (existingPatients && existingPatients.length > 0) {
        console.log('User already registered (Pre-OTP check)');
        setShowDuplicateModal(true);
        return;
      }

      // 2. If not registered, proceed to send OTP
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) {
        if (error.message && error.message.toLowerCase().includes('rate limit')) {
          setStatus('Too many requests. Please wait a moment before trying again.');
        } else {
          setStatus('Error sending verification email: ' + (error.message || error));
        }
        return;
      }

      setStatus('Verification code sent. Check your email and enter the verification code.');
      setStep('verify');

      try {
        window.open('https://mail.google.com', '_blank');
      } catch (e) {
        // ignore
      }
    } catch (err) {
      setStatus('Network error. Please check your connection and try again.');
      console.error('Registration error:', err);
    }
  };

  // Verify OTP code and create patient record after successful verification
  const verifyCode = async () => {
    setStatus('');
    if (!code.trim() || code.trim().length < 4) {
      setStatus('Please enter the verification code.');
      return;
    }

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: 'signup'
      });

      if (error) {
        setStatus('Verification failed: ' + (error.message || error));
        return;
      }

      if (data?.user) {
        // Explicit check for existing patient with this email
        // Using ilike for case-insensitive match and checks list length to avoid single() errors
        console.log('Checking for duplicate email:', email);
        const { data: existingPatients, error: checkError } = await supabase
          .from('patients')
          .select('uhid')
          .eq('email', email.trim().toLowerCase()) // Use stored email or assume DB has lower
          .limit(1);

        console.log('Duplicate check result:', existingPatients, checkError);

        if (checkError) {
          console.error('Error checking for duplicates:', checkError);
          // Verify if RLS is the cause? Proceeding might result in duplicate if RLS blocks read
        }

        // If any record found, it's a duplicate
        if (existingPatients && existingPatients.length > 0) {
          console.log('Duplicate found!');
          setShowDuplicateModal(true);
          return;
        }

        // Insert patient record
        const patientCodeVal = generateShortId();
        const { data: patientData, error: insertError } = await supabase
          .from('patients')
          .insert([{
            name: name.trim(),
            email: email.trim().toLowerCase(), // Force lowercase
            patient_code: patientCodeVal,
            hospital_uhid: null
          }])
          .select('uhid')
          .single();

        if (insertError) {
          console.error('Insert error details:', insertError);
          if (insertError.message && (
            insertError.message.toLowerCase().includes('duplicate') ||
            insertError.message.toLowerCase().includes('unique')
          )) {
            setShowDuplicateModal(true);
            return;
          } else {
            setStatus('Error registering patient: ' + insertError.message);
            return;
          }
        }

        setPatientCode(patientCodeVal);
        setStatus('Registration complete. Welcome!');
        setStep('done');
      } else {
        setStatus('Verification did not return a user object.');
      }
    } catch (err) {
      console.error('verifyCode error:', err);
      setStatus('Verification error: ' + (err.message || err));
    }
  };

  const resendCode = async () => {
    setStatus('');
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) {
        setStatus('Error resending code: ' + (error.message || error));
        return;
      }
      setStatus('Verification code resent. Check your email.');
    } catch (err) {
      console.error('resend error:', err);
      setStatus('Network error while resending code.');
    }
  };

  return (
    <div className="pf-background">
      <div className="pf-medical-icons">
        <div className="pf-medical-shape-1"></div>
        <div className="pf-medical-shape-2"></div>
      </div>
      <div className="pf-card fade-in">
        <div className="pf-header">
          <div className="pf-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="currentColor" />
            </svg>
          </div>
          <h2 className="pf-title">User Registration</h2>
          <p className="pf-subtitle">Join our survey program and earn rewards</p>
        </div>

        {step === 'inputDetails' && (
          <div className="pf-form fade-in-up">
            <div className="pf-input-group">
              <label className="pf-label">Full Name</label>
              <div className="pf-input-wrapper">
                <div className="pf-input-prefix">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="currentColor" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="pf-input"
                />
              </div>
            </div>

            <div className="pf-input-group">
              <label className="pf-label">Email Address</label>
              <div className="pf-input-wrapper">
                <div className="pf-input-prefix">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z" fill="currentColor" />
                  </svg>
                </div>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="pf-input"
                />
              </div>
            </div>

            <button onClick={sendVerificationEmail} className="pf-button primary">
              <span>Send Verification Email</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" fill="currentColor" />
              </svg>
            </button>
          </div>
        )}

        {step === 'verify' && (
          <div className="pf-form fade-in-up">
            <div className="pf-input-group">
              <label className="pf-label">Enter verification code</label>
              <div className="pf-input-wrapper">
                <input
                  type="text"
                  placeholder="Enter code"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  className="pf-input"
                  maxLength={8}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={verifyCode} className="pf-button primary">
                <span>Verify Code</span>
              </button>

              <button onClick={resendCode} className="pf-button secondary">
                <span>Resend Code</span>
              </button>

              <button onClick={() => setStep('inputDetails')} className="pf-button secondary">
                <span>Back</span>
              </button>
            </div>
          </div>
        )}


        {step === 'done' && (
          <div className="pf-success fade-in">
            <div className="pf-success-icon">
              <div className="pf-checkmark">
                <div className="pf-checkmark-stem"></div>
                <div className="pf-checkmark-kick"></div>
              </div>
            </div>

            <h3 className="pf-success-title">Registration Successful!</h3>
            <p className="pf-success-subtitle">Welcome to our survey program</p>

            <div className="pf-patient-id">
              <p className="pf-id-note" style={{ fontSize: '1.1rem', color: '#10b981', margin: '20px 0' }}>
                Please use your <strong>Email Address</strong> to log in and access surveys.
              </p>
            </div>

            <div className="pf-points-info">
              <h4>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', marginRight: '8px', verticalAlign: 'middle' }}>
                  <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor" />
                </svg>
                Points System
              </h4>
              <div className="pf-points-grid">
                <div className="pf-point-item">
                  <span className="pf-point-number">10</span>
                  <span className="pf-point-text">points per question</span>
                </div>
                <div className="pf-point-item">
                  <span className="pf-point-number">{totalPoints}</span>
                  <span className="pf-point-text">total available</span>
                </div>
              </div>
              <p className="pf-points-note">Points can be redeemed for hospital services</p>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '8px' }}>
                {totalQuestions} questions across all forms
              </p>
            </div>

            <div className="pf-next-steps">
              <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
                <button
                  onClick={() => window.location.href = '/survey-access'}
                  className="pf-button primary large"
                >
                  <span>Start Your First Survey</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8.59 16.59L13.17 12L8.59 7.41L10 6L16 12L10 18L8.59 16.59Z" fill="currentColor" />
                  </svg>
                </button>

                <button
                  onClick={() => window.open('https://mail.google.com', '_blank')}
                  className="pf-button secondary large"
                >
                  <span>Open Gmail</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {status && step !== 'done' && (
          <div className={`pf-status ${status.includes('Error') || status.includes('Invalid') || status.includes('expired') ? 'error' : 'success'}`}>
            <div className="pf-status-icon">
              {status.includes('Error') || status.includes('Invalid') || status.includes('expired') ? (
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

      {showDuplicateModal && (
        <div className="pf-modal-overlay">
          <div className="pf-modal-content">
            <div className="pf-modal-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor" />
              </svg>
            </div>
            <h3 className="pf-modal-title">Already Registered</h3>
            <p className="pf-modal-message">
              You are already registered with this email address. Please proceed to the survey page.
            </p>
            <button onClick={() => navigate('/survey-access')} className="pf-modal-button">
              Go to Survey Page
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default PatientForm;
