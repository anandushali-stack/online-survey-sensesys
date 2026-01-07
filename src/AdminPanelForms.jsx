import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import './AdminPanelForms.css';

const AdminPanelForms = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedForm, setSelectedForm] = useState('1');
  const [newQuestion, setNewQuestion] = useState({
    question_text: '',
    type: 'rating',
    options: ['1', '2', '3', '4', '5']
  });
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddNewForm, setShowAddNewForm] = useState(false);
  const [currentOperation, setCurrentOperation] = useState('');
  const [newFormData, setNewFormData] = useState({
    name: '',
    description: ''
  });

  const [surveyForms, setSurveyForms] = useState([
    { id: '1', name: 'Hospital Services', description: 'Survey on general hospital services and facilities' },
    { id: '2', name: 'Staff & Care Quality', description: 'Evaluation of staff performance and care quality' },
    { id: '3', name: 'Facilities & Environment', description: 'Assessment of hospital facilities and environment' },
    { id: '4', name: 'Treatment Experience', description: 'Personal experience with medical treatment' },
    { id: '5', name: 'Doctor Consultation', description: 'Survey on doctor consultation and communication' },
    { id: '6', name: 'Recovery & Follow-up', description: 'Experience with recovery process and follow-up care' }
  ]);

  const getCurrentForm = () => {
    return surveyForms.find(form => form.id === selectedForm);
  };

  useEffect(() => {
    loadForms();
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [selectedForm]);

  const loadForms = async () => {
    try {
      const { data: formsData, error: formsError } = await supabase
        .from('forms')
        .select('*')
        .order('id');

      if (formsError) {
        console.error('Error loading forms from database:', formsError);
        // Fallback to localStorage if database fails
        const savedForms = localStorage.getItem('surveyForms');
        if (savedForms) {
          const parsedForms = JSON.parse(savedForms);
          setSurveyForms(parsedForms);
        }
        return;
      }

      if (formsData && formsData.length > 0) {
        setSurveyForms(formsData);
        // Also save to localStorage as backup
        saveForms(formsData);
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

  const saveForms = (forms) => {
    try {
      localStorage.setItem('surveyForms', JSON.stringify(forms));
    } catch (err) {
      console.error('Error saving forms to localStorage:', err);
    }
  };

  const loadQuestions = async () => {
    setLoading(true);
    setError('');
    setCurrentOperation('Loading questions...');
    try {
      const currentForm = getCurrentForm();
      console.log(`Loading questions for form: ${selectedForm}`);
      const { data, error } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('form_id', selectedForm)
        .order('id');

      if (error) {
        console.error('Error loading questions:', error);
        throw error;
      }

      console.log(`Loaded ${data?.length || 0} questions`);
      setQuestions(data || []);
    } catch (err) {
      console.error('Failed to load questions:', err);
      setError('Failed to load questions: ' + err.message);
    } finally {
      setLoading(false);
      setCurrentOperation('');
    }
  };

  const handleAddQuestion = () => {
    console.log('Add Question button clicked');
    setNewQuestion({
      question_text: '',
      type: 'rating',
      options: ['1', '2', '3', '4', '5']
    });
    setEditingQuestion(null);
    setIsEditing(false);
    setShowAddForm(true);
    setError('');
    setSuccess('');
    console.log('Form should now be visible');
  };

  const handleAddNewForm = () => {
    setNewFormData({
      name: '',
      description: ''
    });
    setShowAddNewForm(true);
    setError('');
    setSuccess('');
  };

  const handleCancelNewForm = () => {
    setShowAddNewForm(false);
    setNewFormData({
      name: '',
      description: ''
    });
    setError('');
    setSuccess('');
  };

  const handleSaveNewForm = async () => {
    if (!newFormData.name.trim() || !newFormData.description.trim()) {
      setError('Please fill in all form details');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setCurrentOperation('Creating new form...');

      // Generate a new form ID (get the highest existing ID + 1)
      const maxId = Math.max(...surveyForms.map(f => parseInt(f.id)));
      const newFormId = (maxId + 1).toString();

      // Try to save form to database, fallback to localStorage if table doesn't exist
      try {
        const { error: formError } = await supabase
          .from('forms')
          .insert([{
            id: newFormId,
            name: newFormData.name.trim(),
            description: newFormData.description.trim()
          }]);

        if (formError) {
          console.log('Forms table not found, using localStorage only:', formError);
          // Continue with localStorage only
        }
      } catch (dbError) {
        console.log('Database error, using localStorage only:', dbError);
        // Continue with localStorage only
      }

      // Create the new form object
      const newForm = {
        id: newFormId,
        name: newFormData.name.trim(),
        description: newFormData.description.trim()
      };

      // Add the new form to the surveyForms array
      const updatedForms = [...surveyForms, newForm];
      setSurveyForms(updatedForms);
      saveForms(updatedForms);

      // Update the selected form to the new one
      setSelectedForm(newFormId);

      setSuccess('New form created successfully! You can now add questions to it.');
      setShowAddNewForm(false);
      setNewFormData({
        name: '',
        description: ''
      });

      // Load questions for the new form (will be empty initially)
      loadQuestions();
    } catch (err) {
      console.error('Failed to create new form:', err);
      setError('Failed to create new form: ' + err.message);
    } finally {
      setLoading(false);
      setCurrentOperation('');
    }
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion(question);
    setNewQuestion({
      question_text: question.question_text,
      type: question.type,
      options: question.options || ['1', '2', '3', '4', '5']
    });
    setIsEditing(true);
    setShowAddForm(true);
    setError('');
    setSuccess('');
  };

  const handleCancelEdit = () => {
    setEditingQuestion(null);
    setIsEditing(false);
    setShowAddForm(false);
    setNewQuestion({
      question_text: '',
      type: 'rating',
      options: ['1', '2', '3', '4', '5']
    });
    setError('');
    setSuccess('');
  };

  const handleSaveQuestion = async () => {
    if (!newQuestion.question_text.trim()) {
      setError('Please enter a question');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setCurrentOperation(isEditing ? 'Updating question...' : 'Creating question...');

      if (isEditing && editingQuestion) {
        // Update existing question
        console.log('Updating question with ID:', editingQuestion.id);
        console.log('New question data:', newQuestion);

        const { error, count } = await supabase
          .from('survey_questions')
          .update({
            question_text: newQuestion.question_text,
            type: newQuestion.type,
            options: ['rating', 'checkbox', 'radio', 'likert'].includes(newQuestion.type) ? newQuestion.options : null
          })
          .eq('id', editingQuestion.id)
          .select();

        if (error) {
          console.error('Error updating question:', error);
          throw error;
        }

        console.log('Question updated successfully');
        setSuccess('Question updated successfully');
      } else {
        // Insert new question
        console.log('Creating new question:', newQuestion);
        const currentForm = getCurrentForm();
        console.log('Form ID:', selectedForm);

        const { data, error } = await supabase
          .from('survey_questions')
          .insert([{
            question_text: newQuestion.question_text,
            type: newQuestion.type,
            options: ['rating', 'checkbox', 'radio', 'likert'].includes(newQuestion.type) ? newQuestion.options : null,
            form_id: selectedForm
          }])
          .select();

        if (error) {
          console.error('Error creating question:', error);
          throw error;
        }

        console.log('Question created successfully:', data);
        setSuccess('Question added successfully');
      }

      // Reset form
      setNewQuestion({
        question_text: '',
        type: 'rating',
        options: ['1', '2', '3', '4', '5']
      });
      setEditingQuestion(null);
      setIsEditing(false);
      setShowAddForm(false);
      loadQuestions();
    } catch (err) {
      console.error('Save operation failed:', err);
      setError(`Failed to ${isEditing ? 'update' : 'add'} question: ` + err.message);
    } finally {
      setLoading(false);
      setCurrentOperation('');
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Are you sure you want to delete this question? This will also delete all related survey responses.')) {
      return;
    }

    try {
      console.log('Attempting to delete question with ID:', questionId);
      setLoading(true);
      setError('');
      setCurrentOperation('Deleting question...');

      // First, check if there are any related survey responses
      console.log('Checking for related survey responses...');
      const { data: responses, error: responsesCheckError } = await supabase
        .from('survey_responses')
        .select('id')
        .eq('question_id', questionId);

      if (responsesCheckError) {
        console.error('Error checking related responses:', responsesCheckError);
        throw new Error('Failed to check related responses: ' + responsesCheckError.message);
      }

      console.log(`Found ${responses?.length || 0} related survey responses`);

      // Delete related survey responses if any exist
      if (responses && responses.length > 0) {
        console.log('Deleting related survey responses...');
        const { error: responsesError, count: responsesCount } = await supabase
          .from('survey_responses')
          .delete({ count: 'exact' })
          .eq('question_id', questionId);

        if (responsesError) {
          console.error('Error deleting related responses:', responsesError);
          throw new Error('Failed to delete related responses: ' + responsesError.message);
        } else {
          console.log(`Deleted ${responsesCount || 0} related survey responses`);
        }
      }

      // Then delete the question
      console.log('Deleting question...');
      const { error, count } = await supabase
        .from('survey_questions')
        .delete({ count: 'exact' })
        .eq('id', questionId);

      if (error) {
        console.error('Error deleting question:', error);
        throw new Error('Failed to delete question: ' + error.message);
      }

      if (count === 0) {
        throw new Error('No question found with the specified ID');
      }

      console.log(`Successfully deleted ${count} question(s)`);
      setSuccess('Question deleted successfully');
      loadQuestions();
    } catch (err) {
      console.error('Delete operation failed:', err);
      setError(err.message || 'Failed to delete question');
    } finally {
      setLoading(false);
      setCurrentOperation('');
    }
  };

  return (
    <div className="admin-container">
      <div className="apf-medical-icons"></div>
      <div className="admin-content-wrapper">
        {/* Form Selection */}
        <div className="admin-form-selector">
          <div className="admin-form-dropdown">
            <label htmlFor="form-select">Select Form:</label>
            <div className="admin-form-select-row">
              <select
                id="form-select"
                value={selectedForm}
                onChange={(e) => setSelectedForm(e.target.value)}
                className="admin-select"
              >
                {surveyForms.map(form => (
                  <option key={form.id} value={form.id}>
                    {form.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddNewForm}
                className="admin-btn admin-btn-secondary admin-btn-small"
              >
                + Add New Form
              </button>
            </div>
          </div>

          <div className="admin-form-info">
            <h3>{getCurrentForm()?.name}</h3>
            <p>{getCurrentForm()?.description}</p>
          </div>
        </div>

        {/* Add New Form */}
        {showAddNewForm && (
          <div className="admin-add-new-form">
            <h3>Create New Form</h3>
            <div className="admin-form-group">
              <label>Form Name</label>
              <input
                type="text"
                value={newFormData.name}
                onChange={(e) => setNewFormData({ ...newFormData, name: e.target.value })}
                className="admin-input"
                placeholder="Enter form name..."
              />
            </div>

            <div className="admin-form-group">
              <label>Form Description</label>
              <textarea
                value={newFormData.description}
                onChange={(e) => setNewFormData({ ...newFormData, description: e.target.value })}
                className="admin-textarea"
                rows="3"
                placeholder="Enter form description..."
              />
            </div>


            <div className="admin-form-actions">
              <button onClick={handleSaveNewForm} className="admin-btn admin-btn-primary">
                Create Form
              </button>
              <button
                onClick={handleCancelNewForm}
                className="admin-btn admin-btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Questions Management */}
        <div className="admin-questions-section">
          <div className="admin-questions-header">
            <h2>Questions for {getCurrentForm()?.name}</h2>
            <button onClick={handleAddQuestion} className="admin-btn admin-btn-primary">
              Add Question
            </button>
          </div>

          {error && <div className="admin-error">{error}</div>}
          {success && <div className="admin-success">{success}</div>}
          {loading && <div className="admin-loading">{currentOperation || 'Processing...'}</div>}

          {/* Add/Edit Question Form */}
          {showAddForm && (
            <div className="admin-add-question">
              <h3>{isEditing ? 'Edit Question' : 'Add New Question'}</h3>
              <div className="admin-form-group">
                <label>Question Text</label>
                <textarea
                  value={newQuestion.question_text}
                  onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
                  className="admin-textarea"
                  rows="3"
                  placeholder="Enter your question here..."
                />
              </div>

              <div className="admin-form-group">
                <label>Question Type</label>
                <select
                  value={newQuestion.type}
                  onChange={(e) => {
                    const type = e.target.value;
                    let defaultOptions = [];

                    if (type === 'likert') {
                      // Matrix structure
                      defaultOptions = {
                        rows: ['Statement 1', 'Statement 2'],
                        scale: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree']
                      };
                    }
                    else if (type === 'rating') defaultOptions = ['1', '2', '3', '4', '5'];
                    else if (type === 'radio' || type === 'checkbox') defaultOptions = ['Option 1', 'Option 2'];

                    setNewQuestion({
                      ...newQuestion,
                      type,
                      options: defaultOptions
                    });
                  }}
                  className="admin-select"
                >
                  <option value="rating">Rating (1-5)</option>
                  <option value="short_answer">Short Answer</option>
                  <option value="checkbox">Checkbox (Multiple Selection)</option>
                  <option value="radio">Radio Button (Single Selection)</option>
                  <option value="likert">Likert Scale</option>
                </select>
              </div>

              {/* Dynamic Options Editor for Checkbox, Radio */}
              {(newQuestion.type === 'checkbox' || newQuestion.type === 'radio') && (
                <div className="admin-form-group">
                  <label>Answer Options</label>
                  <div className="admin-options-editor">
                    {Array.isArray(newQuestion.options) && newQuestion.options.map((option, index) => (
                      <div key={index} className="admin-option-item">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...newQuestion.options];
                            newOptions[index] = e.target.value;
                            setNewQuestion({ ...newQuestion, options: newOptions });
                          }}
                          className="admin-input admin-option-input"
                          placeholder={`Option ${index + 1}`}
                        />
                        <button
                          onClick={() => {
                            const newOptions = newQuestion.options.filter((_, i) => i !== index);
                            setNewQuestion({ ...newQuestion, options: newOptions });
                          }}
                          className="admin-btn-icon remove"
                          title="Remove Option"
                          disabled={newQuestion.options.length <= 1}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        setNewQuestion({
                          ...newQuestion,
                          options: [...newQuestion.options, `Option ${newQuestion.options.length + 1}`]
                        });
                      }}
                      className="admin-btn admin-btn-secondary admin-btn-small"
                      style={{ marginTop: '8px' }}
                    >
                      + Add Option
                    </button>
                  </div>
                </div>
              )}

              {/* Special Editor for Matrix Likert */}
              {newQuestion.type === 'likert' && newQuestion.options && !Array.isArray(newQuestion.options) && (
                <div className="admin-matrix-editor">
                  {/* Rows / Statements Editor */}
                  <div className="admin-form-group">
                    <label>Questions / Statements (Rows)</label>
                    <div className="admin-options-editor">
                      {newQuestion.options.rows.map((row, index) => (
                        <div key={`row-${index}`} className="admin-option-item">
                          <input
                            type="text"
                            value={row}
                            onChange={(e) => {
                              const newRows = [...newQuestion.options.rows];
                              newRows[index] = e.target.value;
                              setNewQuestion({
                                ...newQuestion,
                                options: { ...newQuestion.options, rows: newRows }
                              });
                            }}
                            className="admin-input admin-option-input"
                            placeholder={`Statement ${index + 1}`}
                          />
                          <button
                            onClick={() => {
                              const newRows = newQuestion.options.rows.filter((_, i) => i !== index);
                              setNewQuestion({
                                ...newQuestion,
                                options: { ...newQuestion.options, rows: newRows }
                              });
                            }}
                            className="admin-btn-icon remove"
                            disabled={newQuestion.options.rows.length <= 1}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          setNewQuestion({
                            ...newQuestion,
                            options: {
                              ...newQuestion.options,
                              rows: [...newQuestion.options.rows, `Statement ${newQuestion.options.rows.length + 1}`]
                            }
                          });
                        }}
                        className="admin-btn admin-btn-secondary admin-btn-small"
                        style={{ marginTop: '8px' }}
                      >
                        + Add Statement
                      </button>
                    </div>
                  </div>

                  {/* Scale / Columns Editor */}
                  <div className="admin-form-group">
                    <label>Scale Points (Columns)</label>
                    <div className="admin-options-editor">
                      {newQuestion.options.scale.map((point, index) => (
                        <div key={`scale-${index}`} className="admin-option-item">
                          <input
                            type="text"
                            value={point}
                            onChange={(e) => {
                              const newScale = [...newQuestion.options.scale];
                              newScale[index] = e.target.value;
                              setNewQuestion({
                                ...newQuestion,
                                options: { ...newQuestion.options, scale: newScale }
                              });
                            }}
                            className="admin-input admin-option-input"
                            placeholder={`Scale Point ${index + 1}`}
                          />
                          <button
                            onClick={() => {
                              const newScale = newQuestion.options.scale.filter((_, i) => i !== index);
                              setNewQuestion({
                                ...newQuestion,
                                options: { ...newQuestion.options, scale: newScale }
                              });
                            }}
                            className="admin-btn-icon remove"
                            disabled={newQuestion.options.scale.length <= 1}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          setNewQuestion({
                            ...newQuestion,
                            options: {
                              ...newQuestion.options,
                              scale: [...newQuestion.options.scale, `Point ${newQuestion.options.scale.length + 1}`]
                            }
                          });
                        }}
                        className="admin-btn admin-btn-secondary admin-btn-small"
                        style={{ marginTop: '8px' }}
                      >
                        + Add Scale Point
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="admin-form-actions">
                <button onClick={handleSaveQuestion} className="admin-btn admin-btn-primary">
                  {isEditing ? 'Update Question' : 'Save Question'}
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="admin-btn admin-btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Questions List */}
          <div className="admin-questions-list">
            {loading ? (
              <div className="admin-loading">Loading questions...</div>
            ) : questions.length === 0 ? (
              <div className="admin-empty-state">
                <p>No questions found for this form. Add your first question above.</p>
              </div>
            ) : (
              questions.map((question, index) => (
                <div key={question.id} className="admin-question-item">
                  <div className="admin-question-content">
                    <div className="admin-question-number">Q{index + 1}</div>
                    <div className="admin-question-details">
                      <p className="admin-question-text">{question.question_text}</p>
                      <div className="admin-question-meta">
                        <span className="admin-question-type">{question.type}</span>
                        {question.options && (
                          <span className="admin-question-options">
                            {Array.isArray(question.options)
                              ? `Options: ${question.options.join(', ')}`
                              : `Matrix: ${question.options.rows?.length || 0} items × ${question.options.scale?.length || 0} scale points`
                            }
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="admin-question-actions">
                    <button
                      onClick={() => handleEditQuestion(question)}
                      className="admin-btn admin-btn-small admin-btn-secondary"
                      disabled={loading}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteQuestion(question.id)}
                      className="admin-btn admin-btn-small admin-btn-danger"
                      disabled={loading}
                    >
                      {loading ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanelForms;