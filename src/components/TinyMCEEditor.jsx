// components/TinyMCEEditor.jsx
import React from 'react';
import { Editor } from '@tinymce/tinymce-react';

const TinyMCEEditor = ({ 
  initialValue, 
  onEditorChange, 
  height = 500,
  disabled = false,
  editorRef = null
}) => {
  // Log initial value type for debugging
  console.log('TinyMCE initial value type:', typeof initialValue);
  console.log('TinyMCE initial value preview:', initialValue?.substring(0, 100));

  return (
    <Editor
      tinymceScriptSrc="/tinymce/tinymce.min.js" // Path to your self-hosted TinyMCE
      onInit={(evt, editor) => {
        if (editorRef) {
          editorRef.current = editor;
        }
        console.log('TinyMCE initialized');
      }}
      initialValue={initialValue}
      disabled={disabled}
      init={{
        height: height,
        menubar: true,
        plugins: [
          'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
          'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
          'insertdatetime', 'media', 'table', 'help', 'wordcount', 'emoticons'
        ],

        toolbar: 'undo redo | blocks | ' +
          'bold italic forecolor | alignleft aligncenter ' +
          'alignright alignjustify | bullist numlist outdent indent | ' +
          'removeformat | table | image | code | help',
        content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
        branding: false,
        promotion: false,
        // Additional settings for better HTML handling
        valid_elements: '*[*]', // Allow all elements and attributes
        extended_valid_elements: '*[*]', // Additional validation for custom elements
        entity_encoding: 'raw', // Keep HTML entities as is
        encoding: 'html', // Use HTML encoding
        convert_fonts_to_spans: true,
        fix_list_elements: true,
        browser_spellcheck: true,
        // Format HTML on initialization
        setup: (editor) => {
          editor.on('PreInit', (e) => {
            console.log('TinyMCE PreInit event');
          });
        }
      }}
      onEditorChange={onEditorChange}
    />
  );
};

export default TinyMCEEditor;