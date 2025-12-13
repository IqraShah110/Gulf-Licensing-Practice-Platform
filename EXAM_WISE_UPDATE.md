# Exam-Wise Section Update

## Changes Made

### ✅ Updated Flow

**Before:**
1. Click "Exam-wise MCQs" → Shows months directly
2. Select month → Loads questions

**After:**
1. Click "Exam-wise MCQs" → Shows **Years** (2023, 2024, 2025)
2. Select Year → Shows **Months** for that year
3. Select Month → Loads questions for that year and month

### 📝 Files Modified

1. **`frontend/src/components/modals/ExamWiseModal.js`**
   - Added year selection step
   - Shows years first (2023, 2024, 2025)
   - After year selection, shows months
   - Added "Back to Years" button

2. **`frontend/src/components/ExamWise.js`**
   - Updated to handle both year and month
   - Title now shows: "January 2025" instead of "January 2025"
   - Updated state management for year and month

3. **`frontend/src/components/Home.js`**
   - Updated to pass both year and month to ExamWise component

4. **`frontend/src/App.js`**
   - Updated to pass year and month parameters

5. **`frontend/src/utils/api.js`**
   - Updated `fetchMCQsByExam()` to accept year and month
   - API call: `/get_mcqs/exam/{year}/{month}`

6. **`app.py`**
   - Updated route: `/get_mcqs/exam/<int:year>/<month>`
   - Supports year parameter
   - Currently only 2025 has MCQs, but structure supports other years

### 🎯 User Experience

**New Flow:**
1. User clicks "Exam-wise MCQs" card
2. Modal opens showing:
   ```
   Select Exam Year
   [2023] [2024] [2025]
   ```
3. User clicks a year (e.g., 2025)
4. Modal updates to show:
   ```
   Select Month - 2025
   [← Back to Years]
   [January] [February] [March] ...
   ```
5. User clicks a month (e.g., January)
6. Questions load for "January 2025"
7. Title shows: "January 2025: 1/50"

### 📊 Current Status

- ✅ **2025**: Has MCQs (all months available)
- ⚠️ **2024**: Structure ready, but no MCQs yet (will show "will be updated soon")
- ⚠️ **2023**: Structure ready, but no MCQs yet (will show "will be updated soon")

### 🔧 Backend Support

The backend route now accepts:
- `/get_mcqs/exam/2025/january` ✅
- `/get_mcqs/exam/2024/january` ⚠️ (will return "will be updated soon")
- `/get_mcqs/exam/2023/january` ⚠️ (will return "will be updated soon")

### 🧪 Testing

To test:
1. Click "Exam-wise MCQs"
2. Verify years (2023, 2024, 2025) are shown
3. Select 2025 → Verify months are shown
4. Select a month → Verify questions load
5. Verify title shows correct year and month
6. Test "Back to Years" button
7. Test with 2023 or 2024 → Should show "will be updated soon" message

### 📝 Future Enhancements

When you add MCQs for other years:
1. Add tables in database (e.g., `january24_mcqs`, `january23_mcqs`)
2. Update `MONTH_TABLES_2024` and `MONTH_TABLES_2023` dictionaries in `app.py`
3. The frontend will automatically work with the new data

