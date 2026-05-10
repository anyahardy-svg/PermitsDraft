import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, TextInput } from 'react-native';

const styles = StyleSheet.create({
  editorContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  toolbar: {
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#D1D5DB',
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  toolbarButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  toolbarDivider: {
    width: 1,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 2,
  },
  editorContent: {
    padding: 12,
  },
  textInput: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
    minHeight: 300,
    textAlignVertical: 'top',
    fontFamily: 'System',
  },
});

export default function RichTextEditor({ value = '', onChange, disabled = false, placeholder = 'Enter content...' }) {
  const textInputRef = useRef(null);
  const [cursorPos, setCursorPos] = useState(0);
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  // Get current selection from TextInput - supports both React Native and web
  const getSelection = () => {
    if (!textInputRef.current) {
      return { start: cursorPos, end: cursorPos };
    }

    // Try React Native selection (via ref)
    if (textInputRef.current.selectionStart !== undefined) {
      return {
        start: textInputRef.current.selectionStart || cursorPos,
        end: textInputRef.current.selectionEnd || cursorPos,
      };
    }

    // Fallback to state tracking
    return selection;
  };

  const insertMarkdown = (before, after = '') => {
    if (!value) {
      onChange(before + after);
      return;
    }

    // Get current selection at time of button press
    const current = getSelection();
    let start = current.start;
    let end = current.end;

    // If there's a selection (start !== end), wrap the selected text
    if (start !== end && start >= 0 && end > start) {
      const selectedText = value.substring(start, end);
      const newValue = 
        value.substring(0, start) + 
        before + 
        selectedText + 
        after + 
        value.substring(end);
      onChange(newValue);
      // Move cursor to end of wrapped text
      setCursorPos(start + before.length + selectedText.length + after.length);
    } else {
      // No selection, insert at cursor position
      const insertPos = current.start || cursorPos;
      const newValue = value.substring(0, insertPos) + before + after + value.substring(insertPos);
      onChange(newValue);
      setCursorPos(insertPos + before.length + after.length);
    }
  };

  const formatBold = () => insertMarkdown('<b>', '</b>');
  const formatItalic = () => insertMarkdown('<i>', '</i>');
  const formatUnderline = () => insertMarkdown('<u>', '</u>');
  const formatCode = () => insertMarkdown('`', '`');
  const formatH1 = () => insertMarkdown('# ');
  const formatH2 = () => insertMarkdown('## ');
  const formatH3 = () => insertMarkdown('### ');
  const formatQuote = () => insertMarkdown('> ');
  const formatBullet = () => insertMarkdown('• ');
  const formatNumber = () => insertMarkdown('1. ');
  const formatCodeBlock = () => insertMarkdown('```\n', '\n```');

  return (
    <View style={styles.editorContainer}>
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={formatBold}
          disabled={disabled}
        >
          <Text style={[styles.toolbarButtonText, { fontWeight: '900' }]}>B</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={formatItalic}
          disabled={disabled}
        >
          <Text style={[styles.toolbarButtonText, { fontStyle: 'italic' }]}>I</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={formatUnderline}
          disabled={disabled}
        >
          <Text style={[styles.toolbarButtonText, { textDecorationLine: 'underline' }]}>U</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={formatCode}
          disabled={disabled}
        >
          <Text style={styles.toolbarButtonText}>{'<>'}</Text>
        </TouchableOpacity>

        <View style={styles.toolbarDivider} />

        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={formatH1}
          disabled={disabled}
        >
          <Text style={styles.toolbarButtonText}>H1</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={formatH2}
          disabled={disabled}
        >
          <Text style={styles.toolbarButtonText}>H2</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={formatH3}
          disabled={disabled}
        >
          <Text style={styles.toolbarButtonText}>H3</Text>
        </TouchableOpacity>

        <View style={styles.toolbarDivider} />

        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={formatBullet}
          disabled={disabled}
        >
          <Text style={styles.toolbarButtonText}>• Bullet</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={formatNumber}
          disabled={disabled}
        >
          <Text style={styles.toolbarButtonText}>1. List</Text>
        </TouchableOpacity>

        <View style={styles.toolbarDivider} />

        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={formatQuote}
          disabled={disabled}
        >
          <Text style={styles.toolbarButtonText}>Quote</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={formatCodeBlock}
          disabled={disabled}
        >
          <Text style={styles.toolbarButtonText}>Code</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.editorContent}>
        <TextInput
          ref={textInputRef}
          style={styles.textInput}
          placeholder={placeholder}
          value={value}
          onChangeText={onChange}
          onSelectionChange={(e) => {
            const { start, end } = e.nativeEvent.selection;
            setCursorPos(start);
            setSelection({ start, end });
          }}
          multiline={true}
          editable={!disabled}
          textAlignVertical="top"
          placeholderTextColor="#9CA3AF"
        />
      </View>
    </View>
  );
}
