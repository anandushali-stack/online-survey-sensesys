import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './SurveyQuestions.css';



const POINTS_PER_QUESTION = 10;

function SurveyQuestionsNew() {
  const { formId: formIdParam } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Extract formId from URL parameters
  // URL format: /survey-questions/1
  const formId = formIdParam;

  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [patientCode, setPatientCode] = useState('');

  // Get patient code from location state
  useEffect(() => {
    if (location.state?.patientCode) {
      setPatientCode(location.state.patientCode);
    } else {
      // If no patient code, redirect to survey access
      navigate('/survey-access');
    }
  }, [location.state, navigate]);

  // Load questions from database
  useEffect(() => {
    console.log('SurveyQuestionsNew - formId:', formId);
    if (formId) {
      loadQuestions();
    }
  }, [formId]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      console.log('Loading questions for formId:', formId);
      const { data, error } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('form_id', formId)
        .order('id');

      if (error) {
        console.error('Database error:', error);
        setError('Failed to load questions: ' + error.message + '. Please run the FINAL_DATABASE_FIX.sql script in Supabase SQL Editor.');
        return;
      }

      if (!data || data.length === 0) {
        setError('No questions found for this form. Please contact the administrator.');
        return;
      }

      setQuestions(data);
    } catch (err) {
      setError('Error loading questions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId, answer, type = 'single') => {
    setAnswers(prev => {
      if (type === 'checkbox') {
        // Handle checkbox logic (array of values)
        const currentAnswers = prev[questionId] ? (Array.isArray(prev[questionId]) ? prev[questionId] : [prev[questionId]]) : [];
        let newAnswers;

        if (currentAnswers.includes(answer)) {
          // Remove if already selected
          newAnswers = currentAnswers.filter(a => a !== answer);
        } else {
          // Add if not selected
          newAnswers = [...currentAnswers, answer];
        }

        return {
          ...prev,
          [questionId]: newAnswers
        };
      } else if (type === 'matrix') {
        // Handle matrix/likert logic (object of row -> value)
        const { row, point } = answer;
        const currentMatrix = prev[questionId] && typeof prev[questionId] === 'object' && !Array.isArray(prev[questionId])
          ? prev[questionId]
          : {};

        return {
          ...prev,
          [questionId]: {
            ...currentMatrix,
            [row]: point
          }
        };
      }

      // Standard single value logic
      return {
        ...prev,
        [questionId]: answer
      };
    });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    console.log('Starting survey submission...');
    console.log('Answers:', answers);
    console.log('Questions length:', questions.length);
    console.log('Form ID:', formId);

    if (Object.keys(answers).length !== questions.length) {
      setError('Please answer all questions before submitting.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const patientDataFromState = location.state?.patientData;
      if (!patientDataFromState || !patientDataFromState.uhid) {
        setError('Patient data not found in state. Please restart the survey process.');
        return;
      }
      const uhid = patientDataFromState.uhid;

      // Check if this form has been completed by the patient within the last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: recentSurvey, error: surveyCheckError } = await supabase
        .from('surveys')
        .select('id, created_at')
        .eq('uhid', uhid)
        .eq('form_id', formId)
        .eq('completed', true)
        .gte('created_at', sixMonthsAgo.toISOString())
        .single();

      console.log('Recent survey check:', { recentSurvey, surveyCheckError, uhid, formId, sixMonthsAgo: sixMonthsAgo.toISOString() });

      if (recentSurvey && !surveyCheckError) {
        setError('This form has already been completed within the last 6 months. Please select a different form or try again later.');
        return;
      }

      // If there's an error other than "no rows found", it's a real error
      if (surveyCheckError && surveyCheckError.code !== 'PGRST116') { // PGRST116 means "no rows found"
        console.error('Survey completion check error:', surveyCheckError);
        setError('Error checking form completion status: ' + surveyCheckError.message);
        return;
      }

      // If we reach here, either no recent completed survey exists or no error at all
      console.log('Form is available for completion');

      // Create survey record
      console.log('Creating survey record...');

      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .insert([{
          uhid: uhid,
          completed: true,
          form_id: formId
        }])
        .select()
        .single();

      console.log('Survey creation result:', { surveyData, surveyError });

      if (surveyError) {
        console.error('Survey creation failed:', surveyError);
        setError('Failed to create survey record: ' + surveyError.message);
        return;
      }

      // Save individual responses
      const responseData = questions.map(question => {
        let answerVal = answers[question.id] || '';
        // Convert array answers (checkboxes) to comma-separated string
        if (Array.isArray(answerVal)) {
          answerVal = answerVal.join(', ');
        } else if (typeof answerVal === 'object' && answerVal !== null) {
          // Serialize Matrix object: "Statement: Rating; Statement: Rating"
          answerVal = Object.entries(answerVal)
            .map(([key, value]) => `${key}: ${value}`)
            .join('; ');
        }

        return {
          survey_id: surveyData.id,
          question_id: question.id,
          answer: answerVal,
          points: POINTS_PER_QUESTION
        };
      });

      console.log('Saving responses:', responseData);

      const { error: responsesError } = await supabase
        .from('survey_responses')
        .insert(responseData);

      console.log('Responses save result:', { responsesError });

      if (responsesError) {
        console.error('Failed to save responses:', responsesError);
        setError('Failed to save responses: ' + responsesError.message);
        return;
      }

      // Calculate points: 10 points per question
      const totalPoints = questions.length * 10;
      console.log('Calculated total points:', totalPoints, 'for', questions.length, 'questions (10 points each)');

      // Check if user has already earned points from other forms
      const { data: existingPoints, error: existingPointsError } = await supabase
        .from('points_ledger')
        .select('points_earned')
        .eq('patient_id', uhid);

      if (existingPointsError) {
        console.error('Error checking existing points:', existingPointsError);
      } else {
        const totalExistingPoints = existingPoints?.reduce((sum, p) => sum + (p.points_earned || 0), 0) || 0;
        console.log('Existing points:', totalExistingPoints, 'New points:', totalPoints);

        // No restriction - let users earn points for all forms
        console.log('User will earn', totalPoints, 'points for this form');
      }

      // Update points ledger
      const { error: pointsError } = await supabase
        .from('points_ledger')
        .insert([{
          patient_id: uhid,
          survey_id: surveyData.id,
          points_earned: totalPoints,
          points_redeemed: 0
        }]);

      if (pointsError) {
        console.error('Failed to update points ledger:', pointsError);
        // Don't fail the submission for this
      } else {
        console.log('Points ledger updated successfully:', totalPoints, 'points earned');
      }

      // Track form completion (optional - don't fail if table doesn't exist)
      try {
        const { error: completionError } = await supabase
          .from('patient_form_completion')
          .insert([{
            patient_id: uhid,
            form_id: formId,
            survey_id: surveyData.id
          }]);

        if (completionError) {
          console.log('Form completion tracking not available:', completionError.message);
          // Don't fail the submission for this
        }
      } catch (err) {
        console.log('Form completion tracking not available:', err.message);
        // Don't fail the submission for this
      }

      // Redirect to completion page
      navigate('/survey-complete', {
        state: {
          patientCode,
          points: totalPoints,
          pointsEarned: totalPoints,
          totalQuestions: questions.length,
          answers: answers,
          formId,
          formName: getFormName()
        }
      });

    } catch (err) {
      setError('Error submitting survey: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getFormName = () => {
    const formNames = {
      '1': 'Hospital Services',
      '2': 'Staff & Care Quality',
      '3': 'Facilities & Environment',
      '4': 'Treatment Experience',
      '5': 'Doctor Consultation',
      '6': 'Recovery & Follow-up'
    };
    return formNames[formId] || 'Survey';
  };

  const renderQuestion = (question) => {
    const currentAnswer = answers[question.id] || '';

    switch (question.type) {
      case 'rating':
        return (
          <div>
            <div className="sq-options">
              {question.options.map((option, index) => (
                <label key={index} className="sq-option">
                  <input
                    type="radio"
                    name={`question_${question.id}`}
                    value={index + 1}
                    checked={currentAnswer === (index + 1).toString()}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  />
                  <span className="sq-option-text">{option}</span>
                </label>
              ))}
            </div>
            <div className="sq-rating-status">
              {question.options.map((option, index) => (
                <div
                  key={index}
                  className={`sq-rating-status-item ${answers[question.id] && parseInt(answers[question.id]) > index ? 'answered' : 'unanswered'
                    }`}
                />
              ))}
            </div>
          </div>
        );

      case 'checkbox':
        return (
          <div className="sq-multiple-options">
            {question.options.map((option, index) => (
              <label key={index} className="sq-option checkbox">
                <input
                  type="checkbox"
                  name={`question_${question.id}`}
                  value={option}
                  checked={Array.isArray(answers[question.id]) && answers[question.id].includes(option)}
                  onChange={(e) => handleAnswerChange(question.id, option, 'checkbox')}
                />
                <span className="sq-option-text">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'radio':
      case 'multiple_choice': // handle both legacy and new radio types
        return (
          <div className="sq-multiple-options">
            {question.options.map((option, index) => (
              <label key={index} className="sq-option radio">
                <input
                  type="radio"
                  name={`question_${question.id}`}
                  value={option}
                  checked={currentAnswer === option}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                />
                <span className="sq-option-text">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'likert':
        // Check for Matrix Structure (Object with rows & scale)
        if (question.options && !Array.isArray(question.options) && question.options.rows && question.options.scale) {
          return (
            <div className="sq-likert-matrix-container">
              <table className="sq-likert-matrix">
                <thead>
                  <tr>
                    <th className="sq-likert-statement-header"></th>
                    {question.options.scale.map((point, i) => (
                      <th key={i} className="sq-likert-scale-header">{point}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {question.options.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="sq-likert-row">
                      <td className="sq-likert-statement-cell">{row}</td>
                      {question.options.scale.map((point, colIndex) => (
                        <td key={colIndex} className="sq-likert-radio-cell">
                          <label className="sq-likert-radio-label">
                            <input
                              type="radio"
                              name={`question_${question.id}_row_${rowIndex}`}
                              value={point}
                              checked={answers[question.id] && answers[question.id][row] === point}
                              onChange={() => handleAnswerChange(question.id, { row, point }, 'matrix')}
                            />
                            <span className="sq-likert-custom-radio"></span>
                          </label>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Mobile View (Card per Statement) determined by CSS media queries usually, 
                  but for simplicity we stick to table for now and style it responsive */}
            </div>
          );
        }

        // Fallback for simple Likert (Array of options)
        return (
          <div className="sq-likert-scale">
            <div className="sq-likert-options">
              {Array.isArray(question.options) ? question.options.map((option, index) => (
                <label key={index} className="sq-likert-option">
                  <input
                    type="radio"
                    name={`question_${question.id}`}
                    value={option}
                    checked={currentAnswer === option}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  />
                  <div className="sq-likert-circle"></div>
                  <span className="sq-likert-label">{option}</span>
                </label>
              )) : <div>Invalid Likert Options</div>}
            </div>
          </div>
        );

      default:
        return <div>Unsupported question type: {question.type}</div>;
    }
  };

  if (loading) {
    return (
      <div className="sq-container">
        <div className="sq-medical-icons"></div>
        <div className="sq-content">
          <div className="sq-loading">
            <h2>Loading Survey Questions...</h2>
            <p>Please wait while we prepare your survey.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sq-container">
        <div className="sq-medical-icons"></div>
        <div className="sq-content">
          <div className="sq-error">
            <h2>Error Loading Survey</h2>
            <p>{error}</p>
            <button
              onClick={() => navigate('/survey-access')}
              className="sq-btn sq-btn-primary"
            >
              Back to Survey Access
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="sq-container">
        <div className="sq-medical-icons"></div>
        <div className="sq-content">
          <div className="sq-error">
            <h2>No Questions Available</h2>
            <p>No questions found for this survey form. Please contact the administrator.</p>
            <button
              onClick={() => navigate('/survey-access')}
              className="sq-btn sq-btn-primary"
            >
              Back to Survey Access
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="sq-container">
      <div className="sq-medical-icons"></div>
      <div className="sq-content">
        <div className="sq-header">
          <h2>{getFormName()}</h2>
          <div className="sq-progress">
            <div className="sq-progress-bar">
              <div
                className="sq-progress-fill"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="sq-progress-text">
              Question {currentQuestion + 1} of {questions.length}
            </span>
          </div>
        </div>

        <div className="sq-main-content">
          <div className="sq-question-sidebar">
            <div className="sq-question-numbers">
              {questions.map((q, index) => (
                <div
                  key={q.id}
                  onClick={() => setCurrentQuestion(index)}
                  className={`sq-question-number-item ${index === currentQuestion ? 'sq-current' : ''
                    } ${answers[q.id] ? 'sq-answered' : 'sq-unanswered'}`}
                >
                  <div className="sq-question-number-status">
                    <div className={`sq-question-status-dot ${answers[q.id] ? 'answered' : 'unanswered'}`}>
                      {answers[q.id] ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="sq-question-number-text">{index + 1}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="sq-question-card">
            <div className="sq-question-header">
              <h3>{currentQ.question_text}</h3>
              <div className="sq-question-meta">
                <span className="sq-question-type">{currentQ.type.replace('_', ' ')}</span>
                <span className="sq-points">+{POINTS_PER_QUESTION} points</span>
              </div>
            </div>

            <div className="sq-question-content">
              {renderQuestion(currentQ)}
            </div>

            {error && <div className="sq-error-message">{error}</div>}
          </div>
        </div>

        <div className="sq-navigation">
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className="sq-btn sq-btn-secondary"
          >
            Previous
          </button>

          <div className="sq-navigation-center">
            <span className="sq-answered-count">
              {Object.keys(answers).length} / {questions.length} answered
            </span>
          </div>

          {currentQuestion === questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={submitting || Object.keys(answers).length !== questions.length}
              className="sq-btn sq-btn-primary"
            >
              {submitting ? 'Submitting...' : 'Submit Survey'}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="sq-btn sq-btn-primary"
            >
              Next
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

export default SurveyQuestionsNew;