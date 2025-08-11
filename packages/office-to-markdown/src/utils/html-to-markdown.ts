import TurndownService from "turndown";
import type { ConverterOptions } from "../types/converter.js";

/**
 * Custom HTML to Markdown converter with enhanced table support and other improvements
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
   * Convert HTML string to Markdown
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
   * Add custom table handling rules
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
          if (!headerAdded && i === 0 && this.looksLikeHeaderRow(row)) {
            const cellCount = (row.match(/\|/g) || []).length - 1;
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
   * Add other custom conversion rules
   */
  private addCustomRules(): void {
    // Better handling of headings with proper spacing
    this.turndown.addRule("heading", {
      filter: ["h1", "h2", "h3", "h4", "h5", "h6"],
      replacement: (content: string, node: any) => {
        const level = parseInt(node.nodeName.charAt(1));
        const prefix = "#".repeat(level);
        return `\n${prefix} ${content}\n\n`;
      }
    });

    // Handle math equations (already converted to LaTeX in preprocessing)
    this.turndown.addRule("mathInline", {
      filter: (node: any) => {
        return node.textContent && /^\$.*\$$/.test(node.textContent.trim());
      },
      replacement: (content: string) => content
    });

    this.turndown.addRule("mathBlock", {
      filter: (node: any) => {
        return node.textContent && /^\$\$.*\$\$$/.test(node.textContent.trim());
      },
      replacement: (content: string) => `\n${content}\n`
    });

    // Better paragraph handling
    this.turndown.addRule("paragraph", {
      filter: "p",
      replacement: (content: string) => {
        return content ? `\n${content}\n` : "";
      }
    });

    // Handle line breaks
    this.turndown.addRule("lineBreak", {
      filter: "br",
      replacement: () => "  \n"
    });

    // Handle images with better alt text support
    this.turndown.addRule("image", {
      filter: "img",
      replacement: (content: string, node: any) => {
        const alt = node.getAttribute("alt") || "";
        const src = node.getAttribute("src") || "";
        const title = node.getAttribute("title");
        
        // Skip data URIs and very long URLs
        if (src.startsWith("data:") || src.length > 200) {
          return alt ? `[Image: ${alt}]` : "[Image]";
        }
        
        const titlePart = title ? ` "${title}"` : "";
        return `![${alt}](${src}${titlePart})`;
      }
    });
  }

  /**
   * Pre-process HTML before conversion
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
   * Post-process Markdown after conversion
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
   * Check if a table row looks like a header row
   */
  private looksLikeHeaderRow(row: string): boolean {
    // Simple heuristic: if the row contains bold text or looks like headers
    return /\*\*.*\*\*/.test(row) || 
           /\b(name|title|date|description|id|type|status)\b/i.test(row);
  }
}