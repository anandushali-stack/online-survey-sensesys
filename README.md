# Hospital Survey System - SENSESYS HOSP

A comprehensive survey management system for hospitals with points-based rewards and admin analytics.

## Quick Start

1. **Database Setup**: Run `database.sql` in your Supabase SQL Editor
2. **Install Dependencies**: `npm install`
3. **Start Development**: `npm run dev`
4. **Admin Login**: Username: `admin`, Password: `admin123`

## Features

### Patient Features
- **Patient Registration**: Register with mobile number and receive unique Patient ID (HUID)
- **Survey Access**: Enter Patient ID to access available survey forms
- **Form Completion Tracking**: Each form can only be completed once per patient
- **Points System**: Earn 50 points per question (500 points total across all forms)
- **Points View**: View earned points, redemption history, and available balance
- **Money Conversion**: Redeem points for bill reduction (1 point = ₹1)

### Admin Features
- **Dashboard**: Modern admin panel with sidebar navigation
- **Analytics**: Real-time survey analytics and completion statistics
- **Form Management**: Create and manage survey questions
- **Points Management**: Track and manage patient points and redemptions
- **Patient Search**: Search and manage individual patient data

## Database Structure

### Core Tables
1. **patients** - Patient information and registration
2. **survey_questions** - Survey questions for all forms
3. **surveys** - Survey completion records
4. **survey_responses** - Individual question responses
5. **points_ledger** - Points earned and redeemed tracking
6. **patient_form_completion** - Form completion status tracking
7. **admin_users** - Admin authentication

### Removed Tables (Unused)
- ~~otps~~ - OTP verification (not implemented)
- ~~survey_sessions~~ - Session tracking (replaced by form completion)

## Survey Forms

### General Forms (3 forms)
1. **Hospital Services** - Cleanliness, navigation, facilities
2. **Staff & Care Quality** - Staff politeness, responsiveness
3. **Emergency Department** - Emergency care experience

### Patient Forms (3 forms)
1. **Inpatient Care** - Inpatient treatment experience
2. **Surgery Experience** - Surgical procedure feedback
3. **Discharge Process** - Discharge and follow-up care

## Setup Instructions

### 1. Database Setup
Run the `CLEAN_DATABASE_SETUP.sql` file in Supabase SQL Editor to create the optimized database structure.

### 2. Environment Setup
1. Install dependencies: `npm install`
2. Configure Supabase connection in `src/supabaseClient.js`
3. Start development server: `npm run dev`

### 3. Admin Access
- Username: `admin`
- Password: `admin123`

## Technical Stack

- **Frontend**: React 18, React Router DOM
- **Styling**: CSS3 with modern gradients and animations
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Icons**: Custom SVG icons and React icons

## File Structure

```
src/
├── components/
│   ├── FormCompletionStatus.jsx    # Form completion tracking
│   ├── FormCompletionStatus.css
│   └── SensesysLogo.jsx           # Hospital logo component
├── AdminDashboard.jsx             # Main admin dashboard
├── AdminDashboard.css
├── AdminPanelForms.jsx            # Forms management
├── AdminPanel.css
├── SurveyAccess.jsx               # Patient survey access
├── SurveyAccess.css
├── SurveyQuestionsNew.jsx         # Survey questions component
├── UserPointsView.jsx             # Patient points view
├── UserPointsView.css
├── PatientForm.jsx                # Patient registration
├── PatientForm.css
├── Navigation.jsx                 # Main navigation
├── Navigation.css
├── App.jsx                        # Main app component
└── supabaseClient.js              # Supabase configuration
```

## Key Features Implemented

### Form Completion System
- ✅ One-time form completion per patient
- ✅ Visual completion status tracking
- ✅ Smart form blocking for completed forms
- ✅ Progress tracking across all 6 forms

### Points System
- ✅ 50 points per question
- ✅ Points ledger tracking
- ✅ Money conversion (1 point = ₹1)
- ✅ Redemption history

### Admin Dashboard
- ✅ Modern sidebar navigation
- ✅ Real-time analytics
- ✅ Form management
- ✅ Points management
- ✅ Patient search

### UI/UX
- ✅ Responsive design
- ✅ Modern gradient backgrounds
- ✅ Consistent dark blue theme
- ✅ Professional hospital branding
- ✅ Smooth animations and transitions

## Database Optimization

The database has been optimized to remove unused tables and improve performance:

- **Removed**: `otps`, `survey_sessions` (unused)
- **Added**: `patient_form_completion` (form tracking)
- **Optimized**: Indexes for better query performance
- **Enhanced**: RLS policies for security

## Support

For technical support or questions, contact the development team.

---

**SENSESYS HOSP** - Enhancing patient experience through feedback and rewards.
