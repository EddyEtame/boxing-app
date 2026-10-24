package fr.boxingcenter.ambiance

import android.app.UiModeManager
import android.content.Context
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * L'ambiance choisie dans l'app (clair, sombre ou celle du téléphone), confiée à
 * Android 12+ : le système la garde et la rend dès le lancement suivant, écran de
 * démarrage compris. Sans elle, l'écran natif suivait le téléphone, et un adhérent
 * en clair sur un téléphone sombre voyait le logo sombre à chaque ouverture
 * (Eddy, 24/10/2026). Avant Android 12, rien à faire : l'écran natif suit le téléphone.
 */
class AmbianceModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("BcAmbiance")

    Function("setAppNightMode") { mode: String ->
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return@Function
      val context = appContext.reactContext ?: return@Function
      val uiModeManager = context.getSystemService(Context.UI_MODE_SERVICE) as? UiModeManager ?: return@Function
      val wanted = when (mode) {
        "light" -> UiModeManager.MODE_NIGHT_NO
        "dark" -> UiModeManager.MODE_NIGHT_YES
        else -> UiModeManager.MODE_NIGHT_AUTO
      }
      uiModeManager.setApplicationNightMode(wanted)
    }
  }
}
