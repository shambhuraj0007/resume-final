# Analysis Result Storage & Retrieval Implementation

## Overview
This document outlines the complete implementation of persistent storage for analysis results in MongoDB, enabling users to view previous analyses and generate optimized resumes from saved analysis data.

## Problem Solved
Previously, analysis results were only stored in session/context state. When users navigated away or refreshed the page, the analysis data was lost. This caused errors when trying to generate optimized resumes because required fields were missing.

## Solution Architecture

### 1. Database Model: `AnalysisResult`
**File**: `models/AnalysisResult.ts`

Stores complete analysis data including:
- User ID (reference to User)
- Resume text
- Job description
- All analysis metrics (scores, callbacks, keywords, suggestions)
- Evidence and breakdown data
- Timestamps for tracking

**Indexes**:
- `userId + createdAt` - For efficient history queries
- `userId + currentScore` - For sorting by score

### 2. API Endpoints

#### A. Save Analysis Result
**Endpoint**: `POST /api/ats-check`
**File**: `app/api/ats-check/route.ts`

**Flow**:
1. Perform AI analysis using OpenRouter
2. Save complete result to MongoDB (AnalysisResult collection)
3. Return analysis with `analysisId` in response
4. Deduct credits after successful storage

**Response**:
```json
{
  "currentScore": 75,
  "potentialScore": 88,
  "...": "other analysis data",
  "analysisId": "507f1f77bcf86cd799439011"
}
```

#### B. Fetch Analysis History
**Endpoint**: `GET /api/analysis/history?limit=50&skip=0`
**File**: `app/api/analysis/history/route.ts`

**Returns**:
```json
{
  "analyses": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "fileName": "resume.pdf",
      "currentScore": 75,
      "createdAt": "2024-11-19T10:00:00Z",
      "...": "other fields"
    }
  ],
  "total": 15,
  "limit": 50,
  "skip": 0
}
```

#### C. Fetch Single Analysis
**Endpoint**: `GET /api/analysis/[id]`
**File**: `app/api/analysis/[id]/route.ts`

Returns complete analysis data for viewing or regenerating resume.

#### D. Delete Analysis
**Endpoint**: `DELETE /api/analysis/[id]`
**File**: `app/api/analysis/[id]/route.ts`

Allows users to delete old analyses from history.

#### E. Generate Optimized Resume
**Endpoint**: `POST /api/resume/optimize`
**File**: `app/api/resume/optimize/route.ts`

**Request**:
```json
{
  "analysisId": "507f1f77bcf86cd799439011",
  "resumeText": "original resume text",
  "suggestions": [
    {
      "suggestion": "Add AWS skills",
      "originalText": "Skills: Python, Java",
      "improvedText": "Skills: Python, Java, AWS, Docker"
    }
  ]
}
```

**Features**:
- Fetches analysis from DB if analysisId provided
- Uses suggestions to generate optimized resume
- Deducts credits for optimization
- Returns optimized resume text

### 3. Frontend Integration

#### A. ATS Checker Page Updates
**File**: `app/(main)/ats-checker/page.tsx`

**Changes**:
- Stores `analysisId` from API response
- Passes `analysisId` to optimizer via sessionStorage

**Flow**:
```
1. User analyzes resume
2. API saves to DB, returns analysisId
3. User clicks "Generate Optimized Resume"
4. analysisId passed to optimizer
5. Optimizer uses analysisId to fetch full analysis
6. Generate optimized resume using stored suggestions
```

#### B. Analysis History Component
**File**: `components/credits/AnalysisHistoryList.tsx`

**Features**:
- Displays list of past analyses
- Shows score, date, job description preview
- Action buttons:
  - **View**: Opens analysis details
  - **Generate**: Creates optimized resume from this analysis
  - **Delete**: Removes analysis from history

**Usage in Profile**:
```tsx
<AnalysisHistoryList
  onViewAnalysis={(analysis) => {
    // Show analysis details modal
  }}
  onGenerateResume={(analysis) => {
    // Start optimization with this analysis
  }}
/>
```

### 4. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    ATS Checker Page                         │
│  User uploads resume + job description                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │  POST /api/ats-check           │
        │  - Analyze with OpenRouter     │
        │  - Save to MongoDB             │
        │  - Return analysisId           │
        └────────────────────┬───────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
        ┌──────────────────┐    ┌──────────────────┐
        │ Show Results     │    │ Store analysisId │
        │ on Page          │    │ in sessionStorage│
        └──────────────────┘    └────────┬─────────┘
                                         │
                                         ▼
                        ┌────────────────────────────┐
                        │ User clicks "Generate      │
                        │ Optimized Resume"          │
                        └────────────┬───────────────┘
                                     │
                                     ▼
                    ┌────────────────────────────────┐
                    │ POST /api/resume/optimize      │
                    │ - Fetch analysis from DB       │
                    │ - Apply suggestions            │
                    │ - Generate optimized resume    │
                    │ - Deduct credits               │
                    └────────────────────────────────┘
                                     │
                                     ▼
                    ┌────────────────────────────────┐
                    │ Return optimized resume        │
                    │ Download or view               │
                    └────────────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│                    Profile Page                             │
│  Display Analysis History                                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │  GET /api/analysis/history     │
        │  - Fetch user's analyses       │
        │  - Sort by date                │
        │  - Return list                 │
        └────────────────────┬───────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
        ┌──────────────────┐    ┌──────────────────┐
        │ View Analysis    │    │ Generate Resume  │
        │ GET /api/        │    │ POST /api/resume/│
        │ analysis/[id]    │    │ optimize         │
        └──────────────────┘    └──────────────────┘
```

### 5. Complete User Journey

#### Scenario 1: First Time Analysis
```
1. User goes to ATS Checker
2. Uploads resume PDF + job description
3. Clicks "Analyze My Resume"
4. Analysis is performed and saved to DB
5. analysisId returned and stored
6. Results displayed on page
7. User can immediately click "Generate Optimized Resume"
8. Optimized resume generated using stored analysis
```

#### Scenario 2: View Past Analysis
```
1. User goes to Profile
2. Sees "Analysis History" section
3. Clicks "View" on a past analysis
4. Modal opens showing:
   - Original score vs potential score
   - All suggestions
   - Keywords matched/missing
5. Can click "Generate Resume" to create optimized version
6. Optimized resume generated from stored data
```

#### Scenario 3: Regenerate from History
```
1. User goes to Profile
2. Finds old analysis in history
3. Clicks "Generate" button
4. System fetches analysis from DB
5. Applies all suggestions
6. Generates optimized resume
7. User can download or view
```

### 6. Error Handling

**Insufficient Credits**:
- Check before analysis: `POST /api/ats-check`
- Check before optimization: `POST /api/resume/optimize`
- Return 402 status with required credits

**Missing Analysis**:
- Return 404 if analysis not found
- Verify user owns the analysis (userId match)

**Database Errors**:
- Analysis still completes if DB save fails
- Return error note in response
- Credits still deducted

### 7. Security Considerations

**User Isolation**:
- All queries filter by userId
- Users can only access their own analyses
- DELETE only works for user's own analyses

**Authentication**:
- All endpoints require valid session
- Check `session.user.email` before proceeding
- Fetch user from DB to get userId

**Data Privacy**:
- Resume text and job descriptions stored encrypted (if needed)
- Consider adding data retention policy
- Allow users to delete analyses

### 8. Performance Optimizations

**Indexes**:
- `userId + createdAt` for history queries
- `userId + currentScore` for sorting

**Pagination**:
- Support limit/skip parameters
- Default limit: 50 analyses
- Return total count for UI

**Lean Queries**:
- Use `.lean()` for read-only queries
- Reduces memory footprint

### 9. Testing Checklist

- [ ] Analysis saves to DB with all fields
- [ ] analysisId returned in response
- [ ] Can fetch analysis history
- [ ] Can fetch single analysis
- [ ] Can delete analysis
- [ ] Can generate optimized resume from stored analysis
- [ ] Credits deducted correctly
- [ ] User isolation works (can't access others' analyses)
- [ ] Error handling for missing analyses
- [ ] Error handling for insufficient credits

### 10. Files Modified/Created

**Created**:
- `models/AnalysisResult.ts` - Database model
- `app/api/analysis/history/route.ts` - Fetch history
- `app/api/analysis/[id]/route.ts` - Fetch/delete single
- `app/api/resume/optimize/route.ts` - Generate optimized resume
- `components/credits/AnalysisHistoryList.tsx` - UI component

**Modified**:
- `app/api/ats-check/route.ts` - Save analysis to DB
- `contexts/AnalysisContext.tsx` - Store analysisId
- `app/(main)/ats-checker/page.tsx` - Pass analysisId to optimizer

### 11. Future Enhancements

- [ ] Export analysis as PDF report
- [ ] Compare multiple analyses
- [ ] Share analysis with others
- [ ] Scheduled analysis reminders
- [ ] Analysis templates for common roles
- [ ] Bulk analysis for multiple job postings
