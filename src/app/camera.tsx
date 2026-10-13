import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMealCapture } from '../context/MealCaptureContext';

export default function CameraScreen() {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const { setMealPhotoUri } = useMealCapture();

  const closeCamera = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const takePhoto = async () => {
    if (!cameraRef.current || isTakingPhoto) return;

    try {
      setIsTakingPhoto(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (photo?.uri) setPhotoUri(photo.uri);
    } finally {
      setIsTakingPhoto(false);
    }
  };

  const confirmPhoto = () => {
    if (!photoUri) return;
    setMealPhotoUri(photoUri);
    closeCamera();
  };

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#60A5FA" size="large" />
        <Text style={styles.loadingText}>PREPARANDO CÁMARA...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionScreen}>
        <Text style={styles.permissionIcon}>◎</Text>
        <Text style={styles.permissionTitle}>ACCESO A LA CÁMARA</Text>
        <Text style={styles.permissionCopy}>
          LevelUp necesita la cámara para fotografiar y registrar tus comidas.
        </Text>
        {permission.canAskAgain ? (
          <Pressable style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>[ PERMITIR CÁMARA ]</Text>
          </Pressable>
        ) : (
          <Text style={styles.deniedText}>Activa el permiso de cámara desde los ajustes del dispositivo.</Text>
        )}
        <Pressable style={styles.cancelButton} onPress={closeCamera}>
          <Text style={styles.cancelText}>CANCELAR</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (photoUri) {
    return (
      <View style={styles.previewScreen}>
        <Image source={{ uri: photoUri }} style={styles.previewImage} resizeMode="cover" />
        <SafeAreaView style={styles.previewOverlay} edges={['top', 'bottom']}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>REVISAR CAPTURA</Text>
          </View>
          <View style={styles.previewActions}>
            <Pressable style={[styles.previewButton, styles.retakeButton]} onPress={() => setPhotoUri(null)}>
              <Text style={styles.previewButtonText}>↻ [ REPETIR ]</Text>
            </Pressable>
            <Pressable style={[styles.previewButton, styles.useButton]} onPress={confirmPhoto}>
              <Text style={styles.previewButtonText}>✓ [ USAR FOTO ]</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.cameraScreen}>
      <CameraView ref={cameraRef} style={styles.camera} facing={facing} mode="picture" />
      <SafeAreaView style={styles.cameraOverlay} edges={['top', 'bottom']}>
        <View style={styles.cameraHeader}>
          <Pressable style={styles.roundButton} onPress={closeCamera} accessibilityLabel="Cerrar cámara">
            <Text style={styles.closeIcon}>×</Text>
          </Pressable>
          <View style={styles.cameraBadge}><Text style={styles.cameraBadgeText}>● ESCÁNER DE ALIMENTOS IA</Text></View>
          <Pressable
            style={styles.roundButton}
            onPress={() => setFacing((current) => current === 'back' ? 'front' : 'back')}
            accessibilityLabel="Cambiar cámara"
          >
            <Text style={styles.flipIcon}>↻</Text>
          </Pressable>
        </View>

        <View style={styles.scanFrame}>
          <View style={[styles.corner, styles.cornerTopLeft]} />
          <View style={[styles.corner, styles.cornerTopRight]} />
          <View style={[styles.corner, styles.cornerBottomLeft]} />
          <View style={[styles.corner, styles.cornerBottomRight]} />
          <Text style={styles.scanHint}>CENTRA EL PLATO</Text>
        </View>

        <View style={styles.captureArea}>
          <Text style={styles.captureHint}>Toca para capturar tu comida</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tomar foto"
            disabled={isTakingPhoto}
            onPress={takePhoto}
            style={({ pressed }) => [styles.shutterOuter, pressed && styles.pressed]}
          >
            <View style={styles.shutterInner} />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  cameraScreen: { flex: 1, backgroundColor: '#000000' },
  camera: { flex: 1 },
  cameraOverlay: { position: 'absolute', inset: 0, justifyContent: 'space-between', paddingHorizontal: 20 },
  cameraHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
  roundButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(3, 9, 20, 0.72)', borderWidth: 1, borderColor: '#3678D7', alignItems: 'center', justifyContent: 'center' },
  closeIcon: { color: '#FFFFFF', fontSize: 31, lineHeight: 33, fontWeight: '300' },
  flipIcon: { color: '#60A5FA', fontSize: 25, fontWeight: '900' },
  cameraBadge: { borderWidth: 1, borderColor: '#3B82F6', backgroundColor: 'rgba(3, 9, 20, 0.78)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  cameraBadgeText: { color: '#67E8F9', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  scanFrame: { alignSelf: 'center', width: 255, height: 255, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 18 },
  corner: { position: 'absolute', width: 45, height: 45, borderColor: '#60A5FA' },
  cornerTopLeft: { left: 0, top: 0, borderLeftWidth: 4, borderTopWidth: 4 },
  cornerTopRight: { right: 0, top: 0, borderRightWidth: 4, borderTopWidth: 4 },
  cornerBottomLeft: { left: 0, bottom: 0, borderLeftWidth: 4, borderBottomWidth: 4 },
  cornerBottomRight: { right: 0, bottom: 0, borderRightWidth: 4, borderBottomWidth: 4 },
  scanHint: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, textShadowColor: '#000000', textShadowRadius: 5 },
  captureArea: { alignItems: 'center', paddingBottom: 18 },
  captureHint: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', marginBottom: 14, textShadowColor: '#000000', textShadowRadius: 5 },
  shutterOuter: { width: 78, height: 78, borderRadius: 39, borderWidth: 4, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#60A5FA' },
  pressed: { opacity: 0.65, transform: [{ scale: 0.96 }] },
  centered: { flex: 1, backgroundColor: '#050912', alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { color: '#A7B2C8', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  permissionScreen: { flex: 1, backgroundColor: '#050912', alignItems: 'center', justifyContent: 'center', padding: 32 },
  permissionIcon: { color: '#60A5FA', fontSize: 70, marginBottom: 20 },
  permissionTitle: { color: '#F5F7FF', fontSize: 20, fontWeight: '900', letterSpacing: 1.4, textAlign: 'center' },
  permissionCopy: { color: '#A7B2C8', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 12, marginBottom: 28 },
  permissionButton: { width: '100%', height: 54, borderRadius: 9, backgroundColor: '#347CF0', borderWidth: 1, borderColor: '#60A5FA', alignItems: 'center', justifyContent: 'center' },
  permissionButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 1.2 },
  deniedText: { color: '#FB7185', fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 12 },
  cancelButton: { padding: 18 },
  cancelText: { color: '#A7B2C8', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  previewScreen: { flex: 1, backgroundColor: '#000000' },
  previewImage: { width: '100%', height: '100%' },
  previewOverlay: { position: 'absolute', inset: 0, justifyContent: 'space-between' },
  previewHeader: { alignSelf: 'center', marginTop: 10, backgroundColor: 'rgba(3, 9, 20, 0.78)', borderWidth: 1, borderColor: '#3678D7', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 9 },
  previewTitle: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  previewActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 18 },
  previewButton: { flex: 1, height: 54, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  retakeButton: { backgroundColor: 'rgba(8, 16, 32, 0.9)', borderColor: '#60A5FA' },
  useButton: { backgroundColor: '#347CF0', borderColor: '#93C5FD' },
  previewButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
});
