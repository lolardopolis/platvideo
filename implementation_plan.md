# ClassLink Learning & Async Tutoring Implementation Plan

## Goal Description
Add a demonstration-only "Video Upload" feature. This requires refactoring the application to support navigation between the existing "Class View" and a new "Upload Page".

## User Review Required
None. This is a requested feature extension.

## Proposed Changes

### Navigation Logic
Refactor the application entry point to introduce a simple client-side router (State-based).
- **[NEW] `src/App.tsx`**: Will act as the Layout wrapper and Page Router. It will hold the state `activePage`.
- **[MODIFY] `src/main.tsx`**: Render `App` instead of `CourseInteractionView`.

### Components

#### [MODIFY] `src/components/layout/Sidebar.tsx`
- Add a new menu item: "Subir Contenido" (Upload Content).
- specific styling for this button (maybe primary color) to make it distinct.
- Add prop `onNavigate(page: string)` to handle page switching.

#### [NEW] `src/pages/VideoUploadPage.tsx`
- **UI**:
    - Title/Description inputs.
    - Drag & Drop zone for video files (Visual only).
    - "Select File" button.
    - "Upload" button with Mock Progress Bar animation.
    - Success state after "uploading".

#### [MODIFY] `src/CourseInteractionView.tsx`
- Rename to `src/pages/CourseSessionPage.tsx` for clarity (optional, or just move/wrap it).
- Ensure it accepts layout props if necessary (Layout will likely surround it in `App.tsx`).

## Verification Plan
1.  **Navigation**: Click "Subir Contenido" in Sidebar -> Should render Upload Page.
2.  **Mock Upload**:
    - Fill inputs.
    - Click Upload.
    - Verify progress bar animates 0% -> 100%.
    - Verify Success message appears.
3.  **Return**: Click "Mis Clases" -> Should return to the Course View.
