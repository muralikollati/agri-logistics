import React from "react";
import { View, Text, Modal, StyleSheet, TouchableOpacity, useColorScheme } from "react-native";
import { colors } from "../theme/colors";
import { Ionicons } from "@expo/vector-icons";
import i18n from "../i18n";

export default function CustomDialog({
  visible,
  type = "info", // "success" | "error" | "warning" | "info" | "confirm"
  title,
  message,
  onClose,
  onConfirm,
  confirmText,
  cancelText,
}) {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme || "light"];
  const styles = getStyles(theme);

  const getIcon = () => {
    switch (type) {
      case "success":
        return <Ionicons name="checkmark-circle" size={54} color={theme.success} />;
      case "error":
        return <Ionicons name="alert-circle" size={54} color={theme.error} />;
      case "warning":
        return <Ionicons name="warning" size={54} color={theme.warning} />;
      case "confirm":
        return <Ionicons name="help-circle" size={54} color={theme.primary} />;
      default:
        return <Ionicons name="information-circle" size={54} color={theme.primary} />;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.dialogCard}>
          {/* Status Icon */}
          <View style={styles.iconContainer}>{getIcon()}</View>

          {/* Title */}
          {title ? <Text style={styles.title}>{title}</Text> : null}

          {/* Description Message */}
          {message ? <Text style={styles.message}>{message}</Text> : null}

          {/* Actions Row */}
          <View style={styles.actionsRow}>
            {type === "confirm" ? (
              <>
                <TouchableOpacity
                  style={[styles.btn, styles.cancelBtn]}
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelBtnText}>
                    {cancelText || i18n.t("common.cancel")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.confirmBtn]}
                  onPress={() => {
                    if (onConfirm) onConfirm();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.confirmBtnText}>
                    {confirmText || i18n.t("common.submit")}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.btn, styles.okBtn]}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.okBtnText}>OK</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.55)",
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    dialogCard: {
      width: "100%",
      maxWidth: 340,
      backgroundColor: theme.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 24,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.15,
      shadowRadius: 18,
      elevation: 8,
    },
    iconContainer: {
      marginBottom: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.text,
      textAlign: "center",
      marginBottom: 10,
    },
    message: {
      fontSize: 13,
      color: theme.textSecondary,
      textAlign: "center",
      lineHeight: 18,
      marginBottom: 24,
      paddingHorizontal: 8,
    },
    actionsRow: {
      flexDirection: "row",
      width: "100%",
      gap: 12,
    },
    btn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    okBtn: {
      backgroundColor: theme.primary,
    },
    okBtnText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "bold",
    },
    cancelBtn: {
      backgroundColor: theme.background,
      borderWidth: 1.5,
      borderColor: theme.border,
    },
    cancelBtnText: {
      color: theme.text,
      fontSize: 14,
      fontWeight: "bold",
    },
    confirmBtn: {
      backgroundColor: theme.primary,
    },
    confirmBtnText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "bold",
    },
  });
