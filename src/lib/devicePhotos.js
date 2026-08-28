// iOS PWAs cannot safely write a camera capture directly to Photos. Attempting
// a silent blob download can corrupt the downloaded copy and invalidate the
// live preview. Keep capture handling side-effect free; PhotoSaveViewer owns
// the explicit, user-initiated iOS share-sheet flow.
export function saveCapturedPhotoToDevice() {
  return false
}
