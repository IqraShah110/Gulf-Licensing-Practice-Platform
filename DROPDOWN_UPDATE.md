# Year Dropdown Update

## ✅ Changes Applied

### Updated Exam-Wise Modal Design

**Before:**
- Years displayed horizontally in a grid
- Click year → Shows months in separate view

**After:**
- Years displayed **vertically** (one below the other)
- Each year has a **dropdown button** with chevron icon
- Click year button → **Dropdown expands** to show all months
- Click month → Loads questions for that year and month

## Files Modified

### 1. `templates/index.html`
- Changed year selection to vertical layout
- Each year has its own dropdown container
- Months are shown in a grid within each year's dropdown
- Added Font Awesome chevron icons for dropdown indication

### 2. `static/js/script.js`
- Added `toggleYearDropdown(year)` function
- Updated `backToYearSelection()` to close all dropdowns
- Updated `loadExamDateWithYear()` to accept year parameter
- Only one dropdown can be open at a time (others auto-close)

### 3. `static/css/style.css`
- Added `.year-dropdown-container` styles
- Added `.year-dropdown-btn` styles (full width, hover effects)
- Added `.year-months-grid` styles (grid layout for months)
- Added slide-down animation for dropdown
- Added mobile responsive styles

## User Experience

**New Flow:**
1. User clicks "Exam-wise MCQs"
2. Modal opens showing:
   ```
   Select Exam Year
   
   [2023 ▼]
   [2024 ▼]
   [2025 ▼]
   ```
3. User clicks "2025" button
4. Dropdown expands showing:
   ```
   [2025 ▲]
   ┌─────────────────────────┐
   │ [Jan] [Feb] [Mar] [Apr] │
   │ [May] [Jun] [Jul] [Aug] │
   │ [Sep] [Oct] [Nov] [Dec] │
   └─────────────────────────┘
   [2024 ▼]
   [2023 ▼]
   ```
5. User clicks a month (e.g., "January")
6. Questions load for "January 2025"

## Features

✅ **Vertical Year Layout** - Years stacked vertically
✅ **Dropdown Functionality** - Click year to expand/collapse months
✅ **Visual Indicators** - Chevron icon rotates (▼ → ▲) when open
✅ **Auto-Close** - Opening one dropdown closes others
✅ **Smooth Animation** - Slide-down effect when opening
✅ **Mobile Responsive** - Adapts to smaller screens
✅ **Hover Effects** - Visual feedback on buttons

## Testing

✅ **Test the flow:**
1. Click "Exam-wise MCQs"
2. Verify years are displayed vertically
3. Click "2025" → Verify dropdown expands with months
4. Verify chevron icon rotates
5. Click "2024" → Verify 2025 closes and 2024 opens
6. Click a month → Verify questions load
7. Close modal and reopen → Verify all dropdowns are closed

