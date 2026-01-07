import { useLocation, useNavigate } from 'react-router-dom';
import './SurveyComplete.css';

function SurveyComplete() {
  const location = useLocation();
  const navigate = useNavigate();
  const { patientCode, points, pointsEarned, totalQuestions, answers, category, formId, formName } = location.state || {};

  const handleNewSurvey = () => {
    navigate('/survey-access');
  };

  const handleGoHome = () => {
    navigate('/register');
  };

  if (!patientCode) {
    return (
      <div className="sc-container">
        <div className="sc-medical-icons"></div>
        <div className="sc-card sc-error">
          <h2>Error</h2>
          <p>No survey data found. Please start over.</p>
          <button onClick={handleGoHome} className="sc-button">
            Go to Registration
          </button>
        </div>
      </div>
    );
  }

  // Use the actual points earned from the survey
  const actualPoints = points || pointsEarned || 0;
  const totalPossiblePoints = totalQuestions * 50; // Maximum possible points (all 5-star ratings)
  const pointsPercentage = totalPossiblePoints > 0 ? Math.round((actualPoints / totalPossiblePoints) * 100) : 0;

  return (
    <div className="sc-container">
      <div className="sc-medical-icons"></div>
      <div className="sc-card fade-in">
        <div className="sc-success-icon">
          <div className="sc-checkmark-container">
            <svg className="sc-checkmark-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="checkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#34d399', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#059669', stopOpacity: 1 }} />
                </linearGradient>
                <filter id="checkGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feComponentTransfer in="coloredBlur" result="glowColored">
                    <feFuncA type="linear" slope="0.5" />
                  </feComponentTransfer>
                  <feMerge>
                    <feMergeNode in="glowColored" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <circle cx="50" cy="50" r="42" fill="url(#checkGradient)" filter="url(#checkGlow)" className="sc-check-circle" />
              <path d="M28 50 L42 66 L74 34" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" className="sc-check-path" />
            </svg>
            <div className="sc-check-ripple"></div>
          </div>
        </div>

        <h2 className="sc-title">Thank You for Your Survey!</h2>
        <p className="sc-subtitle">Your valuable input helps us improve our healthcare services</p>

        <div className="sc-points-section fade-in-up">
          <div className="sc-points-header">
            <h3>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', marginRight: '8px', verticalAlign: 'middle' }}>
                <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Congratulations!
            </h3>
            <p>You've successfully completed the survey</p>
          </div>
          <div className="sc-points-earned">
            <div className="sc-points-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor" />
              </svg>
            </div>
            <div className="sc-points-info">
              <span className="sc-points-number">{actualPoints}</span>
              <span className="sc-points-label">Points Earned</span>
            </div>
          </div>
          <div className="sc-points-details">
            <div className="sc-detail-item">
              <span className="sc-detail-label">Form Completed</span>
              <span className="sc-detail-value">{formName || `${category} Form ${formId}`}</span>
            </div>
            <div className="sc-detail-item">
              <span className="sc-detail-label">Questions Answered</span>
              <span className="sc-detail-value">{Object.keys(answers || {}).length}/{totalQuestions}</span>
            </div>
            <div className="sc-detail-item">
              <span className="sc-detail-label">Points per Rating</span>
              <span className="sc-detail-value">10-50 (based on rating)</span>
            </div>
            <div className="sc-detail-item">
              <span className="sc-detail-label">Maximum Possible</span>
              <span className="sc-detail-value">{totalPossiblePoints}</span>
            </div>
            <div className="sc-detail-item">
              <span className="sc-detail-label">Performance</span>
              <span className="sc-detail-value">{pointsPercentage}%</span>
            </div>
          </div>
        </div>

        <div className="sc-total-points-section fade-in-up">
          <div className="sc-total-points-header">
            <h3>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', marginRight: '8px', verticalAlign: 'middle' }}>
                <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor" />
              </svg>
              Your Total Points Balance
            </h3>
            <p>Check your complete points history and balance</p>
          </div>
          <div className="sc-total-points-actions">
            <button
              onClick={() => navigate('/my-points', { state: { patientCode } })}
              className="sc-button-primary"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px' }}>
                <path d="M9 19C9 19.5304 9.21071 20.0391 9.58579 20.4142C9.96086 20.7893 10.4696 21 11 21C11.5304 21 12.0391 20.7893 12.4142 20.4142C12.7893 20.0391 13 19.5304 13 19C13 18.4696 12.7893 17.9609 12.4142 17.5858C12.0391 17.2107 11.5304 17 11 17C10.4696 17 9.96086 17.2107 9.58579 17.5858C9.21071 17.9609 9 18.4696 9 19ZM20 19C20 19.5304 20.2107 20.0391 20.5858 20.4142C20.9609 20.7893 21.4696 21 22 21C22.5304 21 23.0391 20.7893 23.4142 20.4142C23.7893 20.0391 24 19.5304 24 19C24 18.4696 23.7893 17.9609 23.4142 17.5858C23.0391 17.2107 22.5304 17 22 17C21.4696 17 20.9609 17.2107 20.5858 17.5858C20.2107 17.9609 20 18.4696 20 19ZM1 1H5L7.68 14.39C7.77144 14.8504 8.02191 15.264 8.38755 15.5583C8.75318 15.8526 9.2107 16.009 9.68 16H19.4C19.8693 16.009 20.3268 15.8526 20.6925 15.5583C21.0581 15.264 21.3086 14.8504 21.4 14.39L23 6H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              View My Points
            </button>
          </div>
        </div>

        <div className="sc-user-info fade-in-up">
          <div className="sc-user-header">
            <h3>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', marginRight: '8px', verticalAlign: 'middle' }}>
                <path d="M10 2H14C15.1 2 16 2.9 16 4V6H20C21.1 6 22 6.9 22 8V20C22 21.1 21.1 22 20 22H4C2.9 22 2 21.1 2 20V8C2 6.9 2.9 6 4 6H8V4C8 2.9 8.9 2 10 2ZM14 6V4H10V6H14ZM4 8V20H20V8H4Z" fill="currentColor" />
                <path d="M12 17C13.1 17 14 16.1 14 15C14 13.9 13.1 13 12 13C10.9 13 10 13.9 10 15C10 16.1 10.9 17 12 17Z" fill="currentColor" />
              </svg>
              Your Email Address
            </h3>
            <p>Use this email for point redemption</p>
          </div>
          <div className="sc-user-code-display">
            <div className="sc-user-code">{patientCode}</div>
            <button
              onClick={() => navigator.clipboard.writeText(patientCode)}
              className="sc-copy-btn"
              title="Copy to clipboard"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z" fill="currentColor" />
              </svg>
            </button>
          </div>
          <p className="sc-user-note">
            Keep this safe! You'll need it to redeem your points at the billing counter.
          </p>
        </div>

        <div className="sc-redemption-info fade-in-up">
          <div className="sc-redemption-header">
            <h3>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', marginRight: '8px', verticalAlign: 'middle' }}>
                <path d="M12 1V23M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6312 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6312 13.6815 18 14.5717 18 15.5C18 16.4283 17.6312 17.3185 16.9749 17.9749C16.3185 18.6312 15.4283 19 14.5 19H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              How to Redeem Your Points
            </h3>
            <p>Follow these simple steps to use your earned points</p>
          </div>
          <div className="sc-redemption-steps">
            <div className="sc-step">
              <div className="sc-step-number">1</div>
              <div className="sc-step-content">
                <div className="sc-step-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 21H21L20 9H4L3 21ZM5 11H19L19.5 19H4.5L5 11Z" fill="currentColor" />
                    <path d="M9 7V5C9 3.9 9.9 3 11 3H13C14.1 3 15 3.9 15 5V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="sc-step-text">
                  <strong>Visit the Billing Counter</strong>
                  <p>Go to the hospital billing counter with your Email</p>
                </div>
              </div>
            </div>
            <div className="sc-step">
              <div className="sc-step-number">2</div>
              <div className="sc-step-content">
                <div className="sc-step-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17 2H7C5.89543 2 5 2.89543 5 4V20C5 21.1046 5.89543 22 7 22H17C18.1046 22 19 21.1046 19 20V4C19 2.89543 18.1046 2 17 2ZM17 20H7V4H17V20Z" fill="currentColor" />
                    <path d="M8 6H16V8H8V6ZM8 10H16V12H8V10ZM8 14H12V16H8V14Z" fill="currentColor" />
                  </svg>
                </div>
                <div className="sc-step-text">
                  <strong>Present Your Email</strong>
                  <p>Show your registered Email: <code>{patientCode}</code></p>
                </div>
              </div>
            </div>
            <div className="sc-step">
              <div className="sc-step-number">3</div>
              <div className="sc-step-content">
                <div className="sc-step-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 4H3C1.9 4 1 4.9 1 6V18C1 19.1 1.9 20 3 20H21C22.1 20 23 19.1 23 18V6C23 4.9 22.1 4 21 4ZM21 18H3V8H21V18ZM21 6H3V6H21V6Z" fill="currentColor" />
                    <path d="M7 15H9V17H7V15ZM11 15H13V17H11V15ZM15 15H17V17H15V15Z" fill="currentColor" />
                  </svg>
                </div>
                <div className="sc-step-text">
                  <strong>Get Discount</strong>
                  <p>Your points will be deducted from your bill (1 point = ₹1)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="sc-redemption-uses fade-in-up">
          <h4>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline-block', marginRight: '8px', verticalAlign: 'middle' }}>
              <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor" />
            </svg>
            Points can be used for:
          </h4>
          <div className="sc-uses-grid">
            <div className="sc-use-item">
              <div className="sc-use-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor" />
                </svg>
              </div>
              <span>OPD Consultation fees</span>
            </div>
            <div className="sc-use-item">
              <div className="sc-use-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 11H15M9 15H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H17C18.1046 3 19 3.89543 19 5V19C19 20.1046 18.1046 21 17 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span>Diagnostic tests (X-ray, blood tests, etc.)</span>
            </div>
            <div className="sc-use-item">
              <div className="sc-use-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="currentColor" />
                </svg>
              </div>
              <span>Physiotherapy sessions</span>
            </div>
            <div className="sc-use-item">
              <div className="sc-use-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 12C3 7.03 7.03 3 12 3C16.97 3 21 7.03 21 12C21 16.97 16.97 21 12 21C7.03 21 3 16.97 3 12ZM12 5C8.13 5 5 8.13 5 12C5 15.87 8.13 19 12 19C15.87 19 19 15.87 19 12C19 8.13 15.87 5 12 5Z" fill="currentColor" />
                  <path d="M12 7V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span>Follow-up consultations</span>
            </div>
            <div className="sc-use-item">
              <div className="sc-use-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 21H21L20 9H4L3 21ZM5 11H19L19.5 19H4.5L5 11Z" fill="currentColor" />
                  <path d="M9 7V5C9 3.9 9.9 3 11 3H13C14.1 3 15 3.9 15 5V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span>Other hospital services</span>
            </div>
          </div>
        </div>

        <div className="sc-actions fade-in-up">
          <button onClick={handleNewSurvey} className="sc-button sc-button-secondary">
            <span>Take Another Survey</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4ZM20 6H4V18H20V6ZM6 8H18V10H6V8ZM6 12H16V14H6V12Z" fill="currentColor" />
            </svg>
          </button>
          <button onClick={handleGoHome} className="sc-button sc-button-primary">
            <span>Register New User</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="currentColor" />
            </svg>
          </button>
        </div>

        <div className="sc-footer fade-in-up">
          <div className="sc-footer-content">
            <p className="sc-footer-main">Thank you for helping us improve our services!</p>
            <p className="sc-footer-note">
              Your survey is valuable and helps us provide better healthcare.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SurveyComplete;
