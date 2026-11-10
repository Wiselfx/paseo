import { useCallback, useRef, useState, type ReactElement } from "react";
import { Pressable, View } from "react-native";
import { Search, X } from "lucide-react-native";
import { StyleSheet, withUnistyles } from "react-native-unistyles";
import { createControlGeometry } from "@/components/ui/control-geometry";
import { focusRingStyle } from "@/components/ui/focus-ring";
import type { Theme } from "@/styles/theme";
import {
  EditingTextInput as TextInput,
  type EditingTextInputHandle,
} from "@/components/ui/text-input";

const ThemedSearch = withUnistyles(Search);
const ThemedX = withUnistyles(X);
const ThemedTextInput = withUnistyles(TextInput, (theme: Theme) => ({
  placeholderTextColor: theme.colors.foregroundExtraMuted,
  selectionColor: theme.colors.foreground,
}));

const mutedColorMapping = (theme: Theme) => ({ color: theme.colors.foregroundExtraMuted });

export interface SearchFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  /** Falls back to `placeholder`, which already names the field. */
  accessibilityLabel?: string;
  clearAccessibilityLabel: string;
  testID?: string;
  clearTestID?: string;
}

/**
 * The standalone search box that leads a screen's filter rail. Its chrome is
 * the host filter pill's, so the two sit on the same rail and read as one row
 * of controls; only the border colour moves on focus, which keeps the leading
 * icon from shifting. It owns its own clear affordance — a caller rendering its
 * own X has been handed the wrong component.
 */
export function SearchField({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  clearAccessibilityLabel,
  testID,
  clearTestID,
}: SearchFieldProps): ReactElement {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<EditingTextInputHandle>(null);
  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => setIsFocused(false), []);
  const handleClear = useCallback(() => {
    inputRef.current?.replaceText("");
    onChangeText("");
  }, [onChangeText]);

  return (
    <View style={[styles.field, isFocused && styles.fieldFocused]}>
      <ThemedSearch size={14} uniProps={mutedColorMapping} />
      <ThemedTextInput
        testID={testID}
        ref={inputRef}
        initialValue={value}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        accessibilityLabel={accessibilityLabel ?? placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        style={styles.input}
      />
      {value.length > 0 ? (
        <Pressable
          testID={clearTestID}
          onPress={handleClear}
          accessibilityRole="button"
          accessibilityLabel={clearAccessibilityLabel}
          hitSlop={8}
        >
          <ThemedX size={14} uniProps={mutedColorMapping} />
        </Pressable>
      ) : null}
    </View>
  );
}

const SEARCH_FIELD_MAX_WIDTH = 420;

const styles = StyleSheet.create((theme) => {
  const geometry = createControlGeometry(theme);

  return {
    field: {
      ...geometry.fieldControlMd,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing[2],
      flex: 1,
      minWidth: 0,
      maxWidth: SEARCH_FIELD_MAX_WIDTH,
      backgroundColor: theme.colors.surface1,
      borderWidth: theme.borderWidth[1],
      borderColor: theme.colors.border,
      // Checked after the shared ring so the input itself never paints a second one.
      outlineWidth: 0,
    },
    fieldFocused: {
      ...focusRingStyle(),
    },
    input: {
      flex: 1,
      minWidth: 0,
      padding: 0,
      height: 20,
      outlineWidth: 0,
      color: theme.colors.foreground,
      fontSize: theme.fontSize.base,
      lineHeight: 20,
    },
  };
});
