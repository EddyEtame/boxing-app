import { Image, type ImageProps } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { PropsWithChildren } from 'react';
import { ImageBackground, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { duration } from '@/ui/theme';

/** Le type d’une photo dans toute l’app (require() ou URI), celui d’expo-image. */
export type PhotoSource = ImageProps['source'];

type PhotoProps = PropsWithChildren<{
  source: PhotoSource;
  style?: StyleProp<ViewStyle>;
  /** Assombrissement global (0 à 1). La charte : 50 % sur les héros. */
  darken?: number;
  /** Voile de bas de cadre pour poser du texte : hauteur relative (0 à 1). */
  scrim?: number;
  /** Voile du haut (sous la barre d’état). */
  scrimTop?: number;
  /** Vignettage noir sur les bords. */
  vignette?: boolean;
  /** Grain cinéma 6 à 8 %. */
  grain?: boolean;
  contentPosition?: ImageProps['contentPosition'];
  priority?: ImageProps['priority'];
}>;

const GRAIN = require('@/assets/textures/grain.png');

/**
 * Une photo réelle, traitée comme la charte le demande : assombrie, voilée là
 * où le texte se pose, vignettée, grainée. Les enfants se posent par-dessus.
 */
export function Photo({ source, style, darken = 0.35, scrim = 0.6, scrimTop = 0, vignette = true, grain = true, contentPosition, priority, children }: PhotoProps) {
  return (
    <View style={[styles.root, style]}>
      <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={contentPosition} transition={duration.round} priority={priority} cachePolicy="memory-disk" />
      {darken > 0 ? <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(8,8,8,${darken})` }]} /> : null}
      {vignette ? (
        <>
          <LinearGradient pointerEvents="none" colors={['rgba(8,8,8,0.55)', 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 0.35, y: 0.5 }} style={StyleSheet.absoluteFill} />
          <LinearGradient pointerEvents="none" colors={['transparent', 'rgba(8,8,8,0.55)']} start={{ x: 0.65, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
        </>
      ) : null}
      {scrimTop > 0 ? <LinearGradient pointerEvents="none" colors={['rgba(8,8,8,0.85)', 'transparent']} style={[styles.top, { height: `${Math.round(scrimTop * 100)}%` }]} /> : null}
      {scrim > 0 ? <LinearGradient pointerEvents="none" colors={['transparent', 'rgba(8,8,8,0.72)', 'rgba(8,8,8,0.96)']} locations={[0, 0.55, 1]} style={[styles.bottom, { height: `${Math.round(scrim * 100)}%` }]} /> : null}
      {grain ? <ImageBackground pointerEvents="none" source={GRAIN} resizeMode="repeat" style={[StyleSheet.absoluteFill, styles.grain]} /> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden', backgroundColor: '#0B0D14' },
  top: { position: 'absolute', left: 0, right: 0, top: 0 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  grain: { opacity: 0.07 },
});
