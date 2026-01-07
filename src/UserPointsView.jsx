import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './UserPointsView.css';

function UserPointsView() {
  const navigate = useNavigate();
  const [searchHUID, setSearchHUID] = useState('');
  const [patient, setPatient] = useState(null);
  const [pointsData, setPointsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSearchPoints = async () => {
    if (!searchHUID.trim()) {
      setError('Please enter your Patient ID (HUID)');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Search for patient by HUID
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('patient_code', searchHUID.trim())
        .single();

      if (patientError || !patientData) {
        setError('Patient not found with HUID: ' + searchHUID);
        setPatient(null);
        setPointsData(null);
        return;
      }

      setPatient(patientData);

      // Get patient's points data
      const { data: pointsData, error: pointsError } = await supabase
        .from('points_ledger')
        .select('*')
        .eq('patient_id', patientData.uhid)
        .order('record_at', { ascending: false });

      if (pointsError) {
        setError('Failed to load points data: ' + pointsError.message);
        return;
      }

      const totalEarned = pointsData?.reduce((sum, p) => sum + (p.points_earned || 0), 0) || 0;
      const totalRedeemed = pointsData?.reduce((sum, p) => sum + (p.points_redeemed || 0), 0) || 0;
      const availablePoints = totalEarned - totalRedeemed;

      // Debug logging
      console.log('Points data for patient:', pointsData);
      console.log('Total earned:', totalEarned);
      console.log('Total redeemed:', totalRedeemed);
      console.log('Available points:', availablePoints);

      setPointsData({
        totalEarned,
        totalRedeemed,
        availablePoints,
        transactions: pointsData || []
      });

      setSuccess(`Welcome back, ${patientData.name}!`);
    } catch (err) {
      setError('Error searching for points: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionType = (transaction) => {
    if (transaction.points_earned > 0) {
      return {
        type: 'Points Earned',
        amount: transaction.points_earned,
        icon: '⭐',
        color: 'positive',
        description: 'Survey completion reward'
      };
    } else if (transaction.points_redeemed > 0) {
      const redemptionType = transaction.redemption_type || 'points';
      const moneyEquivalent = transaction.money_equivalent || 0;
      const reason = transaction.redemption_reason || 'Points redemption';
      
      return {
        type: redemptionType === 'money' ? 'Money Redemption' : 'Points Redemption',
        amount: transaction.points_redeemed,
        icon: redemptionType === 'money' ? '💰' : '💳',
        color: 'negative',
        description: redemptionType === 'money' 
          ? `Redeemed for ₹${moneyEquivalent} - ${reason}`
          : `Points redeemed - ${reason}`,
        moneyEquivalent: moneyEquivalent
      };
    }
    return {
      type: 'Unknown',
      amount: 0,
      icon: '❓',
      color: 'neutral',
      description: 'Unknown transaction'
    };
  };

  return (
    <div className="user-points-container">
        <div className="up-medical-icons"></div>
        <div className="user-points-wrapper">
          <div className="user-points-header">
            <h1>Points Tracker</h1>
            <p>Track your rewards and redemption history</p>
          </div>

          {error && <div className="user-points-error">{error}</div>}
          {success && <div className="user-points-success">{success}</div>}

          {/* Search Section */}
          <div className="user-points-search">
            <div className="user-search-card">
              <h3>Enter Your Survey ID</h3>
              <p>Use your Survey ID to view your points and redemption history</p>
              <div className="user-search-form">
                <input
                  type="text"
                  value={searchHUID}
                  onChange={(e) => setSearchHUID(e.target.value)}
                  placeholder="Enter your Survey ID"
                  className="user-search-input"
                  disabled={loading}
                />
                <button 
                  onClick={handleSearchPoints}
                  className="user-search-button"
                  disabled={loading || !searchHUID.trim()}
                >
                  {loading ? 'Searching...' : 'View My Points'}
                </button>
              </div>
            </div>
          </div>

          {/* Patient Information and Points Summary */}
          {patient && pointsData && (
            <div className="user-points-content">
              {/* Patient Info Card */}
              <div className="user-patient-card">
                <div className="user-patient-header">
                  <div className="user-patient-avatar">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="currentColor"/>
                    </svg>
                  </div>
                  <div className="user-patient-info">
                    <h3>{patient.name}</h3>
                    <p>Patient ID: {patient.patient_code}</p>
                    <p>Mobile: {patient.mobile}</p>
                  </div>
                </div>
              </div>

              {/* Points Summary */}
              <div className="user-points-summary">
                <h3>Points Summary</h3>
                <div className="user-points-grid">
                  <div className="user-points-card earned">
                    <div className="user-points-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor"/>
                      </svg>
                    </div>
                    <div className="user-points-details">
                      <span className="user-points-label">Total Earned</span>
                      <span className="user-points-value">{pointsData.totalEarned}</span>
                    </div>
                  </div>

                  <div className="user-points-card redeemed">
                    <div className="user-points-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17 2H7C5.89543 2 5 2.89543 5 4V20C5 21.1046 5.89543 22 7 22H17C18.1046 22 19 21.1046 19 20V4C19 2.89543 18.1046 2 17 2ZM17 20H7V4H17V20Z" fill="currentColor"/>
                        <path d="M8 6H16V8H8V6ZM8 10H16V12H8V10ZM8 14H12V16H8V14Z" fill="currentColor"/>
                      </svg>
                    </div>
                    <div className="user-points-details">
                      <span className="user-points-label">Total Redeemed</span>
                      <span className="user-points-value">{pointsData.totalRedeemed}</span>
                      {pointsData.totalRedeemed > 0 && (
                        <span className="user-points-subtitle">
                          {pointsData.totalRedeemed} points redeemed
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="user-points-card available">
                    <div className="user-points-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 1V23M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6312 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6312 13.6815 18 14.5717 18 15.5C18 16.4283 17.6312 17.3185 16.9749 17.9749C16.3185 18.6312 15.4283 19 14.5 19H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="user-points-details">
                      <span className="user-points-label">Available Points</span>
                      <span className={`user-points-value ${pointsData.availablePoints > 0 ? 'positive' : 'zero'}`}>
                        {pointsData.availablePoints}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transaction History */}
              <div className="user-transaction-history">
                <h3>Transaction History</h3>
                {pointsData.transactions.length === 0 ? (
                  <div className="user-empty-state">
                    <div className="user-empty-icon">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <p>No transactions found</p>
                    <p className="user-empty-subtitle">Complete surveys to earn points!</p>
                  </div>
                ) : (
                  <div className="user-transactions-list">
                    {pointsData.transactions.map((transaction, index) => {
                      const transactionInfo = getTransactionType(transaction);
                      return (
                        <div key={transaction.id || index} className="user-transaction-card">
                          <div className="user-transaction-icon">
                            <span className="user-transaction-emoji">{transactionInfo.icon}</span>
                          </div>
                          <div className="user-transaction-details">
                            <div className="user-transaction-type">
                              <span className={`user-transaction-label ${transactionInfo.color}`}>
                                {transactionInfo.type}
                              </span>
                              <span className={`user-transaction-amount ${transactionInfo.color}`}>
                                {transactionInfo.type.includes('Earned') ? '+' : '-'}{transactionInfo.amount}
                                {transactionInfo.moneyEquivalent > 0 && (
                                  <span className="user-money-equivalent">
                                    (₹{transactionInfo.moneyEquivalent})
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="user-transaction-description">
                              {transactionInfo.description}
                            </div>
                            <div className="user-transaction-date">
                              {formatDate(transaction.record_at)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Redemption Information */}
              <div className="user-redemption-info">
                <h3>How to Redeem Your Points</h3>
                <div className="user-redemption-steps">
                  <div className="user-redemption-step">
                    <div className="user-step-number">1</div>
                    <div className="user-step-content">
                      <h4>Visit Billing Counter</h4>
                      <p>Go to the hospital billing counter with your Patient ID</p>
                    </div>
                  </div>
                  <div className="user-redemption-step">
                    <div className="user-step-number">2</div>
                    <div className="user-step-content">
                      <h4>Present Your ID</h4>
                      <p>Show your Patient ID: <strong>{patient.patient_code}</strong></p>
                    </div>
                  </div>
                  <div className="user-redemption-step">
                    <div className="user-step-number">3</div>
                    <div className="user-step-content">
                      <h4>Get Discount</h4>
                      <p>Your points will be deducted from your bill (1 point = ₹1)</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="user-points-actions">
                <button 
                  onClick={() => navigate('/register')}
                  className="user-action-button user-button-primary"
                >
                  Register New Patient
                </button>
                <button 
                  onClick={() => navigate('/survey-access')}
                  className="user-action-button user-button-secondary"
                >
                  Take Another Survey
                </button>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}

export default UserPointsView;
