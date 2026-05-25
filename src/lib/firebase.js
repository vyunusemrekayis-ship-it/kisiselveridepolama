// Firebase - dinamik import ile yüklenir (index.html'deki gibi)
// Firestore ve Auth global olarak window'a atanır

export function initFirebase() {
  // Firebase zaten index.html'den yükleniyor
  // Bu dosya sadece bağlantı noktası
}

export function setupFirestoreSync(onData) {
  // window._fbUser, window._fbDb vb. global'lar kullanılır
  window._onFirestoreData = onData;
}
