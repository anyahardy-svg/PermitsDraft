import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  text: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
  },
  bold: {
    fontWeight: 'bold',
  },
  italic: {
    fontStyle: 'italic',
  },
  underline: {
    textDecorationLine: 'underline',
  },
  code: {
    fontFamily: 'Courier New',
    fontSize: 14,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 4,
    borderRadius: 3,
  },
  heading1: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  heading2: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 14,
    marginBottom: 7,
  },
  heading3: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 6,
  },
  quote: {
    borderLeftWidth: 4,
    borderLeftColor: '#9CA3AF',
    paddingLeft: 12,
    marginVertical: 8,
    fontStyle: 'italic',
    color: '#6B7280',
  },
  codeBlock: {
    backgroundColor: '#1F2937',
    color: '#E5E7EB',
    padding: 12,
    borderRadius: 6,
    fontFamily: 'Courier New',
    marginVertical: 8,
    fontSize: 12,
    lineHeight: 18,
  },
  bulletItem: {
    flexDirection: 'row',
    marginVertical: 4,
    marginLeft: 16,
  },
  bullet: {
    marginRight: 8,
    color: '#1F2937',
  },
  numberedItem: {
    flexDirection: 'row',
    marginVertical: 4,
    marginLeft: 16,
  },
  number: {
    marginRight: 8,
    color: '#1F2937',
    minWidth: 20,
  },
  paragraph: {
    marginVertical: 6,
  },
});

/**
 * Parse and render markdown-formatted text
 * Supports: **bold**, *italic*, `code`, # headings, > quotes, • bullets, 1. numbers, ```code blocks```
 */
export default function MarkdownRenderer({ text }) {
  if (!text) {
    return <Text style={styles.text}>No content</Text>;
  }

  // Split text into lines for processing
  const lines = text.split('\n');
  const elements = [];
  let inCodeBlock = false;
  let codeBlockContent = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        elements.push(
          <View key={`code-${i}`} style={styles.codeBlock}>
            <Text style={{ color: '#E5E7EB', fontFamily: 'Courier New', fontSize: 12 }}>
              {codeBlockContent}
            </Text>
          </View>
        );
        codeBlockContent = '';
        inCodeBlock = false;
      } else {
        // Start of code block
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent += (codeBlockContent ? '\n' : '') + line;
      continue;
    }

    // Handle block elements
    if (line.trim().startsWith('# ')) {
      // H1
      elements.push(
        <Text key={`h1-${i}`} style={[styles.text, styles.heading1]}>
          {parseInlineMarkdown(line.substring(2).trim())}
        </Text>
      );
    } else if (line.trim().startsWith('## ')) {
      // H2
      elements.push(
        <Text key={`h2-${i}`} style={[styles.text, styles.heading2]}>
          {parseInlineMarkdown(line.substring(3).trim())}
        </Text>
      );
    } else if (line.trim().startsWith('### ')) {
      // H3
      elements.push(
        <Text key={`h3-${i}`} style={[styles.text, styles.heading3]}>
          {parseInlineMarkdown(line.substring(4).trim())}
        </Text>
      );
    } else if (line.trim().startsWith('> ')) {
      // Quote
      elements.push(
        <View key={`quote-${i}`} style={styles.quote}>
          <Text style={[styles.text, { color: '#6B7280' }]}>
            {parseInlineMarkdown(line.substring(2).trim())}
          </Text>
        </View>
      );
    } else if (line.trim().startsWith('• ')) {
      // Bullet point
      elements.push(
        <View key={`bullet-${i}`} style={styles.bulletItem}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.text}>{parseInlineMarkdown(line.substring(2).trim())}</Text>
        </View>
      );
    } else if (/^\d+\.\s/.test(line.trim())) {
      // Numbered list
      const match = line.match(/^(\d+)\.\s(.+)/);
      if (match) {
        elements.push(
          <View key={`number-${i}`} style={styles.numberedItem}>
            <Text style={styles.number}>{match[1]}.</Text>
            <Text style={styles.text}>{parseInlineMarkdown(match[2])}</Text>
          </View>
        );
      }
    } else if (line.trim()) {
      // Regular paragraph with inline formatting
      elements.push(
        <Text key={`p-${i}`} style={[styles.text, styles.paragraph]}>
          {parseInlineMarkdown(line)}
        </Text>
      );
    } else {
      // Empty line - add spacing
      elements.push(<View key={`space-${i}`} style={{ height: 8 }} />);
    }
  }

  return <View style={styles.container}>{elements}</View>;
}

/**
 * Parse inline markdown formatting: **bold**, *italic*, `code`, <u>underline</u>
 */
function parseInlineMarkdown(text) {
  if (!text) return text;

  const children = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Check for <b>text</b> (HTML bold)
    const htmlBoldMatch = remaining.match(/<b>([\s\S]+?)<\/b>/);
    if (htmlBoldMatch) {
      const beforeMatch = remaining.substring(0, htmlBoldMatch.index);
      if (beforeMatch) children.push(beforeMatch);
      children.push(
        <Text key={`b-${key++}`} style={styles.bold}>
          {htmlBoldMatch[1]}
        </Text>
      );
      remaining = remaining.substring(htmlBoldMatch.index + htmlBoldMatch[0].length);
      continue;
    }

    // Check for <strong>text</strong> (HTML strong)
    const strongMatch = remaining.match(/<strong>([\s\S]+?)<\/strong>/);
    if (strongMatch) {
      const beforeMatch = remaining.substring(0, strongMatch.index);
      if (beforeMatch) children.push(beforeMatch);
      children.push(
        <Text key={`strong-${key++}`} style={styles.bold}>
          {strongMatch[1]}
        </Text>
      );
      remaining = remaining.substring(strongMatch.index + strongMatch[0].length);
      continue;
    }

    // Check for bold (**text**)
    const boldMatch = remaining.match(/\*\*([\s\S]+?)\*\*/);
    if (boldMatch) {
      const beforeMatch = remaining.substring(0, boldMatch.index);
      if (beforeMatch) children.push(beforeMatch);
      children.push(
        <Text key={`b-${key++}`} style={styles.bold}>
          {boldMatch[1]}
        </Text>
      );
      remaining = remaining.substring(boldMatch.index + boldMatch[0].length);
      continue;
    }

    // Check for <i>text</i> (HTML italic)
    const htmlItalicMatch = remaining.match(/<i>([\s\S]+?)<\/i>/);
    if (htmlItalicMatch) {
      const beforeMatch = remaining.substring(0, htmlItalicMatch.index);
      if (beforeMatch) children.push(beforeMatch);
      children.push(
        <Text key={`i-${key++}`} style={styles.italic}>
          {htmlItalicMatch[1]}
        </Text>
      );
      remaining = remaining.substring(htmlItalicMatch.index + htmlItalicMatch[0].length);
      continue;
    }

    // Check for <em>text</em> (HTML emphasis)
    const emMatch = remaining.match(/<em>([\s\S]+?)<\/em>/);
    if (emMatch) {
      const beforeMatch = remaining.substring(0, emMatch.index);
      if (beforeMatch) children.push(beforeMatch);
      children.push(
        <Text key={`em-${key++}`} style={styles.italic}>
          {emMatch[1]}
        </Text>
      );
      remaining = remaining.substring(emMatch.index + emMatch[0].length);
      continue;
    }

    // Check for italic (*text*)
    const italicMatch = remaining.match(/\*([\s\S]+?)\*/);
    if (italicMatch) {
      const beforeMatch = remaining.substring(0, italicMatch.index);
      if (beforeMatch) children.push(beforeMatch);
      children.push(
        <Text key={`i-${key++}`} style={styles.italic}>
          {italicMatch[1]}
        </Text>
      );
      remaining = remaining.substring(italicMatch.index + italicMatch[0].length);
      continue;
    }

    // Check for code (`text`)
    const codeMatch = remaining.match(/`([\s\S]+?)`/);
    if (codeMatch) {
      const beforeMatch = remaining.substring(0, codeMatch.index);
      if (beforeMatch) children.push(beforeMatch);
      children.push(
        <Text key={`c-${key++}`} style={styles.code}>
          {codeMatch[1]}
        </Text>
      );
      remaining = remaining.substring(codeMatch.index + codeMatch[0].length);
      continue;
    }

    // Check for underline (<u>text</u>)
    const underlineMatch = remaining.match(/<u>([\s\S]+?)<\/u>/)
    if (underlineMatch) {
      const beforeMatch = remaining.substring(0, underlineMatch.index);
      if (beforeMatch) children.push(beforeMatch);
      children.push(
        <Text key={`u-${key++}`} style={styles.underline}>
          {underlineMatch[1]}
        </Text>
      );
      remaining = remaining.substring(underlineMatch.index + underlineMatch[0].length);
      continue;
    }

    // No more formatting found, add remaining text
    children.push(remaining);
    break;
  }

  // Wrap all children in a single Text element to prevent wrapping issues between styled elements
  return <Text style={styles.text}>{children}</Text>;
}
