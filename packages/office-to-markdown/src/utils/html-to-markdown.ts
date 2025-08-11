import TurndownService from "turndown";
import type { ConverterOptions } from "../types/converter.js";

/**
 * Custom HTML to Markdown converter with enhanced features.
 * 
 * Extends the base Turndown service with:
 * - Enhanced table processing with proper column alignment
 * - Math equation preservation (LaTeX)
 * - Improved handling of complex HTML structures
 * - Custom preprocessing and postprocessing
 * - Configurable output formatting
 * 
 * **Key Features:**
 * - Table preservation with Markdown table syntax
 * - Math equation detection and LaTeX preservation
 * - Clean handling of nested elements
 * - Configurable heading styles (ATX vs Setext)
 * - Proper whitespace normalization
 * 
 * @example
 * ```typescript
 * const converter = new CustomHtmlToMarkdown({
 *   headingStyle: 'atx',
 *   preserveTables: true
 * });
 * const markdown = converter.convert('<h1>Title</h1><p>Content</p>');
 * ```
 */
export class CustomHtmlToMarkdown {
  private turndown: TurndownService;

  constructor(options: ConverterOptions = {}) {
    this.turndown = new TurndownService({
      headingStyle: options.headingStyle === "setext" ? "setext" : "atx",
      hr: "---",
      bulletListMarker: "-",
      codeBlockStyle: "fenced",
      fence: "```",
      emDelimiter: "*",
      strongDelimiter: "**",
      linkStyle: "inlined",
      linkReferenceStyle: "full",
      preformattedCode: false,
    });

    // Configure table rules if preserveTables is enabled
    if (options.preserveTables !== false) {
      this.addTableRules();
    }

    // Add custom rules for better conversion
    this.addCustomRules();
  }

  /**
   * Convert HTML string to Markdown using custom processing pipeline.
   * 
   * **Processing Pipeline:**
   * 1. **Preprocessing**: Handles special HTML structures and LaTeX equations
   * 2. **Core Conversion**: Uses Turndown service with custom rules
   * 3. **Postprocessing**: Cleans up output and normalizes formatting
   * 
   * @param html - Input HTML string to convert
   * @returns Clean Markdown string with proper formatting
   * 
   * @example
   * ```typescript
   * const html = '<table><tr><th>Name</th><th>Value</th></tr><tr><td>A</td><td>1</td></tr></table>';
   * const markdown = converter.convert(html);
   * // Returns: | Name | Value |\n|------|-------|\n| A    | 1     |
   * ```
   */
  convert(html: string): string {
    // Pre-process the HTML to handle special cases
    html = this.preprocessHtml(html);
    
    // Convert to Markdown
    let markdown = this.turndown.turndown(html);
    
    // Post-process the Markdown
    markdown = this.postprocessMarkdown(markdown);
    
    return markdown;
  }

  /**
   * Add enhanced table handling rules to the Turndown service.
   * 
   * Configures custom rules for:
   * - Table structure (`<table>`, `<thead>`, `<tbody>`)
   * - Table rows (`<tr>`) with proper line breaks
   * - Header cells (`<th>`) with separator row generation
   * - Data cells (`<td>`) with proper column separation
   * 
   * **Generated Format:**
   * ```markdown
   * | Header 1 | Header 2 |
   * |----------|----------|
   * | Cell 1   | Cell 2   |
   * ```
   * 
   * @private
   */
  private addTableRules(): void {
    // Enhanced table rule with better formatting
    this.turndown.addRule("table", {
      filter: "table",
      replacement: (content: string) => {
        // Split content into rows
        const rows = content.trim().split("\n").filter(row => row.trim());
        if (rows.length === 0) return "";

        let result = "\n";
        let headerAdded = false;

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          
          // Add the row
          result += row + "\n";
          
          // Add header separator after first row if it looks like a header
          if (!headerAdded && i === 0 && this.looksLikeHeaderRow(row || "")) {
            const cellCount = ((row || "").match(/\|/g) || []).length - 1;
            const separator = "|" + " --- |".repeat(cellCount);
            result += separator + "\n";
            headerAdded = true;
          }
        }
        
        return result + "\n";
      }
    });

    // Table row rule
    this.turndown.addRule("tableRow", {
      filter: "tr",
      replacement: (content: string) => {
        // Ensure content starts and ends with pipe
        const cleanContent = content.trim();
        if (!cleanContent) return "";
        return `|${cleanContent}\n`;
      }
    });

    // Table cell rules
    this.turndown.addRule("tableCell", {
      filter: ["td", "th"],
      replacement: (content: string) => {
        // Clean up content and escape pipes
        content = content.trim().replace(/\|/g, "\\|").replace(/\n/g, " ");
        return ` ${content} |`;
      }
    });
  }

  /**
   * Add custom conversion rules for enhanced HTML to Markdown conversion.
   * 
   * Configures specialized rules for:
   * - **Headings**: Consistent ATX format with proper spacing
   * - **Math equations**: Preserves LaTeX formatting (inline and block)
   * - **Paragraphs**: Smart handling with math equation detection
   * - **Line breaks**: Context-aware conversion (inside paragraphs vs standalone)
   * - **Images**: Data URI handling and cleanup
   * - **Links**: JavaScript removal and safe URL processing
   * - **Code blocks**: Language detection and proper formatting
   * - **Lists**: Enhanced nested content handling
   * 
   * @private
   */
  private addCustomRules(): void {
    // Remove the default heading rule first
    this.turndown.remove("heading");
    
    // Better handling of headings with proper spacing and consistent format
    this.turndown.addRule("customHeading", {
      filter: ["h1", "h2", "h3", "h4", "h5", "h6"],
      replacement: (content: string, node: any) => {
        const level = parseInt(node.nodeName.charAt(1));
        const prefix = "#".repeat(level);
        const cleanContent = content.trim().replace(/\n/g, " ");
        
        // Ensure proper spacing before and after headings
        return `\n\n${prefix} ${cleanContent}\n\n`;
      }
    });

    // Handle math equations (already converted to LaTeX in preprocessing)  
    this.turndown.addRule("mathInline", {
      filter: (node: any) => {
        const text = node.textContent || "";
        return text.match(/^\$[^$]+\$$/);
      },
      replacement: (content: string) => {
        // Preserve inline math as-is
        return content.trim();
      }
    });

    this.turndown.addRule("mathBlock", {
      filter: (node: any) => {
        const text = node.textContent || "";
        return text.match(/^\$\$[\s\S]+\$\$$/);
      },
      replacement: (content: string) => {
        // Preserve block math with proper spacing
        return `\n\n${content.trim()}\n\n`;
      }
    });

    // Better paragraph handling to avoid excessive line breaks
    this.turndown.addRule("customParagraph", {
      filter: "p",
      replacement: (content: string) => {
        const cleanContent = content.trim();
        if (!cleanContent) return "";
        
        // Check if this is a math paragraph
        if (cleanContent.match(/^\$\$[\s\S]+\$\$$/)) {
          return `\n\n${cleanContent}\n\n`;
        }
        
        return `${cleanContent}\n\n`;
      }
    });

    // Handle line breaks more intelligently
    this.turndown.addRule("smartLineBreak", {
      filter: "br",
      replacement: (_content: string, node: any) => {
        // Check if we're inside a paragraph or list item
        const parent = node.parentNode;
        if (parent && (parent.nodeName === "P" || parent.nodeName === "LI")) {
          return "  \n"; // Markdown line break
        }
        return "\n"; // Just a new line
      }
    });

    // Enhanced image handling with data URI cleanup
    this.turndown.addRule("smartImage", {
      filter: "img",
      replacement: (_content: string, node: any) => {
        const alt = node.getAttribute("alt") || "";
        const src = node.getAttribute("src") || "";
        const title = node.getAttribute("title");
        
        // Handle data URIs - truncate or remove them
        if (src.startsWith("data:")) {
          if (src.length > 100) {
            const mimeType = src.split(";")[0].replace("data:", "");
            return alt ? `![${alt}](data:${mimeType}...)` : `![Image](data:${mimeType}...)`;
          }
        }
        
        // Skip very long URLs that might be problematic
        if (src.length > 500) {
          return alt ? `[${alt}]` : "[Image]";
        }
        
        const titlePart = title ? ` "${title.replace(/"/g, '\\"')}"` : "";
        return `![${alt}](${src}${titlePart})`;
      }
    });

    // Handle hyperlinks with JavaScript removal
    this.turndown.addRule("safeLink", {
      filter: "a",
      replacement: (content: string, node: any) => {
        const href = node.getAttribute("href");
        const title = node.getAttribute("title");
        
        if (!href || href.startsWith("javascript:") || href.startsWith("vbscript:")) {
          return content; // Just return the text content
        }
        
        // Handle relative URLs and clean up
        let cleanHref = href;
        try {
          // Basic URL validation
          if (cleanHref.includes(" ")) {
            cleanHref = encodeURI(cleanHref);
          }
        } catch (error) {
          return content; // If URL is invalid, just return text
        }
        
        const titlePart = title ? ` "${title.replace(/"/g, '\\"')}"` : "";
        
        // Auto-link if text matches href
        if (content.trim() === cleanHref && !title) {
          return `<${cleanHref}>`;
        }
        
        return `[${content}](${cleanHref}${titlePart})`;
      }
    });

    // Handle code blocks better
    this.turndown.addRule("codeBlock", {
      filter: "pre",
      replacement: (content: string, node: any) => {
        const codeElement = node.querySelector("code");
        if (codeElement) {
          const language = codeElement.className.replace(/language-/, "") || "";
          return `\n\`\`\`${language}\n${content}\n\`\`\`\n\n`;
        }
        return `\n\`\`\`\n${content}\n\`\`\`\n\n`;
      }
    });

    // Better list handling
    this.turndown.addRule("listItem", {
      filter: "li",
      replacement: (content: string, _node: any, options: any) => {
        const cleanContent = content.trim();
        if (!cleanContent) return "";
        
        const prefix = options.bulletListMarker || "-";
        
        // Handle nested content properly
        const indentedContent = cleanContent
          .split("\n")
          .map((line, index) => index === 0 ? line : `  ${line}`)
          .join("\n");
        
        return `${prefix} ${indentedContent}\n`;
      }
    });
  }

  /**
   * Pre-process HTML before conversion to handle special cases.
   * 
   * **Processing Steps:**
   * 1. Remove script and style tags for security
   * 2. Normalize excessive whitespace while preserving structure
   * 3. Clean up Word-specific XML namespace tags
   * 4. Prepare HTML for optimal Turndown processing
   * 
   * @param html - Raw HTML string to preprocess
   * @returns Cleaned HTML ready for conversion
   * @private
   */
  private preprocessHtml(html: string): string {
    // Remove script and style tags
    html = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/(script|style)>/gi, "");
    
    // Clean up excessive whitespace but preserve structure
    html = html.replace(/\n\s*\n\s*\n/g, "\n\n");
    
    // Handle Word-specific elements
    html = html.replace(/<w:([^>]*)>/g, ""); // Remove Word namespace tags
    html = html.replace(/<\/w:([^>]*)>/g, "");
    
    return html;
  }

  /**
   * Post-process Markdown after conversion to clean up formatting.
   * 
   * **Processing Steps:**
   * 1. Normalize line endings (Windows to Unix)
   * 2. Clean up excessive blank lines (max 3 consecutive)
   * 3. Fix spacing around headings
   * 4. Ensure proper list formatting
   * 5. Clean up table formatting
   * 6. Remove trailing spaces (except intentional line breaks)
   * 7. Ensure document ends with single newline
   * 
   * @param markdown - Raw Markdown string to postprocess
   * @returns Cleaned and formatted Markdown
   * @private
   */
  private postprocessMarkdown(markdown: string): string {
    // Normalize line endings
    markdown = markdown.replace(/\r\n/g, "\n");
    
    // Clean up excessive blank lines
    markdown = markdown.replace(/\n{4,}/g, "\n\n\n");
    
    // Fix spacing around headings
    markdown = markdown.replace(/\n(#{1,6} .+)\n{1}/g, "\n$1\n\n");
    
    // Ensure lists have proper spacing
    markdown = markdown.replace(/\n([*\-+] .+)\n([*\-+] .+)/g, "\n$1\n$2");
    
    // Clean up table formatting
    markdown = markdown.replace(/\|\s*\|\s*\|/g, "| |");
    
    // Remove trailing spaces except for line breaks
    markdown = markdown.split("\n").map(line => {
      if (line.endsWith("  ")) {
        return line; // Keep line breaks
      }
      return line.trimEnd();
    }).join("\n");
    
    // Ensure document ends with single newline
    markdown = markdown.trimEnd() + "\n";
    
    return markdown;
  }

  /**
   * Check if a table row looks like a header row using heuristics.
   * 
   * Uses simple pattern matching to detect:
   * - Bold text formatting (`**text**`)
   * - Common header keywords (name, title, date, etc.)
   * 
   * @param row - Table row string to analyze
   * @returns True if the row appears to be a header
   * @private
   */
  private looksLikeHeaderRow(row: string): boolean {
    // Simple heuristic: if the row contains bold text or looks like headers
    return /\*\*.*\*\*/.test(row) || 
           /\b(name|title|date|description|id|type|status)\b/i.test(row);
  }
}