import { spawn, execSync } from "node:child_process";
import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { resolve, join, extname, basename } from "node:path";
import { createChildLogger } from "../shared/logger.js";
import { GitOps } from "./git.js";
import { TestRunner } from "./testRunner.js";
import { Formatter } from "./formatter.js";
import { VisualRunner } from "./visualRunner.js";
import { RulesFileManager } from "./rulesFile.js";

export interface ToolResult {
	success: boolean;
	data?: any;
	error?: string;
	output?: string;
}

export interface Tool {
	name: string;
	description: string;
	parameters: {
		type: "object";
		properties: Record<string, any>;
		required?: string[];
	};
	execute: (params: any) => Promise<ToolResult>;
}

export class ToolCaller {
	private readonly log = createChildLogger("tool-caller");
	private readonly repoRoot: string;
	private readonly git: GitOps;
	private readonly testRunner: TestRunner;
	private readonly formatter: Formatter;
	private readonly visualRunner: VisualRunner;
	private readonly rules: RulesFileManager;

	constructor(repoRoot: string) {
		this.repoRoot = resolve(repoRoot);
		this.git = new GitOps(this.repoRoot);
		this.testRunner = new TestRunner();
		this.formatter = new Formatter();
		this.visualRunner = new VisualRunner(this.repoRoot);
		this.rules = new RulesFileManager(this.repoRoot);
	}

	async initialize() {
		await this.git.ensureRepo();
		await this.rules.ensureExists();
	}

	getSystemPrompt(): string {
		return `You are an advanced AI assistant with comprehensive access to development tools and codebase context. You can help with:

## AVAILABLE TOOLS

### Git Operations
- \`create_branch\`: Create and switch to a new git branch
- \`switch_branch\`: Switch to an existing branch  
- \`get_current_branch\`: Get the current git branch
- \`get_git_status\`: Get git status and changes
- \`commit_changes\`: Commit staged changes with a message
- \`get_git_log\`: Get recent git commit history

### Code Analysis & File Operations
- \`read_file\`: Read contents of a file
- \`write_file\`: Write content to a file
- \`list_directory\`: List contents of a directory
- \`search_codebase\`: Search for patterns in the codebase
- \`get_file_info\`: Get metadata about a file
- \`analyze_dependencies\`: Analyze project dependencies

### Testing & Quality
- \`run_tests\`: Execute test suite (Jest/Mocha autodetect)
- \`format_code\`: Format code using project formatters
- \`run_linting\`: Run code linting/static analysis
- \`visual_regression_test\`: Run visual regression tests

### Project Management
- \`get_project_structure\`: Get an overview of the project structure
- \`get_package_info\`: Get package.json information
- \`install_dependencies\`: Install npm dependencies
- \`get_build_info\`: Get build configuration information

## CONTEXT AWARENESS
You have full context of the current repository including:
- Project structure and file organization
- Dependencies and package configuration  
- Git history and current branch status
- Test setup and configuration
- Build and deployment setup

## GUIDELINES
1. **Always use tools** rather than making assumptions about code or project state
2. **Read before writing** - use \`read_file\` to understand existing code before making changes
3. **Test after changes** - run tests to verify your modifications work
4. **Use git properly** - create branches for experimental changes
5. **Be thorough** - analyze dependencies and impacts before making changes
6. **Format consistently** - use \`format_code\` to maintain code style
7. **Document your reasoning** - explain why you're using specific tools and approaches

## WORKFLOW SUGGESTIONS
1. Start by understanding the project: \`get_project_structure\`, \`get_package_info\`
2. Check current state: \`get_current_branch\`, \`get_git_status\`
3. Create a working branch: \`create_branch\` for any changes
4. Read relevant files: \`read_file\` to understand existing code
5. Make informed changes: \`write_file\` with proper understanding
6. Test your changes: \`run_tests\` to ensure everything works
7. Format and clean up: \`format_code\` for consistency
8. Commit your work: \`commit_changes\` with clear messages

You can help with debugging, feature development, refactoring, testing, documentation, and any other development tasks. Always use the available tools to provide accurate, contextual assistance.`;
	}

	getAvailableTools(): Tool[] {
		return [
			// Git Operations
			{
				name: "create_branch",
				description: "Create and switch to a new git branch",
				parameters: {
					type: "object",
					properties: {
						branchName: { type: "string", description: "Name of the new branch" },
						fromBranch: { type: "string", description: "Base branch (optional, defaults to current)" }
					},
					required: ["branchName"]
				},
				execute: async (params) => {
					try {
						const branch = await this.git.createTempBranch(params.branchName);
						return { success: true, data: { branch }, output: `Created and switched to branch: ${branch}` };
					} catch (error) {
						return { success: false, error: String(error) };
					}
				}
			},
			{
				name: "switch_branch",
				description: "Switch to an existing git branch",
				parameters: {
					type: "object",
					properties: {
						branchName: { type: "string", description: "Name of the branch to switch to" }
					},
					required: ["branchName"]
				},
				execute: async (params) => {
					try {
						execSync(`git checkout ${params.branchName}`, { cwd: this.repoRoot });
						return { success: true, output: `Switched to branch: ${params.branchName}` };
					} catch (error) {
						return { success: false, error: String(error) };
					}
				}
			},
			{
				name: "get_current_branch",
				description: "Get the current git branch",
				parameters: { type: "object", properties: {} },
				execute: async () => {
					try {
						const branch = execSync("git branch --show-current", { cwd: this.repoRoot, encoding: "utf8" }).trim();
						return { success: true, data: { branch }, output: `Current branch: ${branch}` };
					} catch (error) {
						return { success: false, error: String(error) };
					}
				}
			},
			{
				name: "get_git_status",
				description: "Get git status and changes",
				parameters: { type: "object", properties: {} },
				execute: async () => {
					try {
						const status = execSync("git status --porcelain", { cwd: this.repoRoot, encoding: "utf8" });
						const changes = status.split('\n').filter(line => line.trim()).map(line => {
							const status = line.substring(0, 2);
							const file = line.substring(3);
							return { status, file };
						});
						return { success: true, data: { changes, raw: status }, output: `Found ${changes.length} changes` };
					} catch (error) {
						return { success: false, error: String(error) };
					}
				}
			},
			{
				name: "commit_changes",
				description: "Commit staged changes with a message",
				parameters: {
					type: "object",
					properties: {
						message: { type: "string", description: "Commit message" },
						addAll: { type: "boolean", description: "Add all changes before committing (default: false)" }
					},
					required: ["message"]
				},
				execute: async (params) => {
					try {
						if (params.addAll) {
							execSync("git add .", { cwd: this.repoRoot });
						}
						execSync(`git commit -m "${params.message}"`, { cwd: this.repoRoot });
						return { success: true, output: `Committed changes: ${params.message}` };
					} catch (error) {
						return { success: false, error: String(error) };
					}
				}
			},
			{
				name: "get_git_log",
				description: "Get recent git commit history",
				parameters: {
					type: "object",
					properties: {
						count: { type: "number", description: "Number of commits to show (default: 10)" }
					}
				},
				execute: async (params) => {
					try {
						const count = params.count || 10;
						const log = execSync(`git log --oneline -${count}`, { cwd: this.repoRoot, encoding: "utf8" });
						const commits = log.split('\n').filter(line => line.trim()).map(line => {
							const [hash, ...messageParts] = line.split(' ');
							return { hash, message: messageParts.join(' ') };
						});
						return { success: true, data: { commits }, output: `Retrieved ${commits.length} recent commits` };
					} catch (error) {
						return { success: false, error: String(error) };
					}
				}
			},

			// File Operations
			{
				name: "read_file",
				description: "Read contents of a file",
				parameters: {
					type: "object",
					properties: {
						filePath: { type: "string", description: "Path to the file to read" }
					},
					required: ["filePath"]
				},
				execute: async (params) => {
					try {
						const fullPath = resolve(this.repoRoot, params.filePath);
						const content = await readFile(fullPath, "utf8");
						return { success: true, data: { content, path: params.filePath }, output: `Read file: ${params.filePath}` };
					} catch (error) {
						return { success: false, error: String(error) };
					}
				}
			},
			{
				name: "write_file",
				description: "Write content to a file",
				parameters: {
					type: "object",
					properties: {
						filePath: { type: "string", description: "Path to the file to write" },
						content: { type: "string", description: "Content to write to the file" }
					},
					required: ["filePath", "content"]
				},
				execute: async (params) => {
					try {
						const fullPath = resolve(this.repoRoot, params.filePath);
						await writeFile(fullPath, params.content, "utf8");
						return { success: true, output: `Wrote file: ${params.filePath}` };
					} catch (error) {
						return { success: false, error: String(error) };
					}
				}
			},
			{
				name: "list_directory",
				description: "List contents of a directory",
				parameters: {
					type: "object",
					properties: {
						dirPath: { type: "string", description: "Path to the directory (default: current directory)" }
					}
				},
				execute: async (params) => {
					try {
						const dirPath = params.dirPath || ".";
						const fullPath = resolve(this.repoRoot, dirPath);
						const entries = await readdir(fullPath);
						const details = await Promise.all(entries.map(async (entry) => {
							const entryPath = join(fullPath, entry);
							const stats = await stat(entryPath);
							return {
								name: entry,
								type: stats.isDirectory() ? "directory" : "file",
								size: stats.size,
								modified: stats.mtime
							};
						}));
						return { success: true, data: { entries: details, path: dirPath }, output: `Listed ${entries.length} items in ${dirPath}` };
					} catch (error) {
						return { success: false, error: String(error) };
					}
				}
			},
			{
				name: "search_codebase",
				description: "Search for patterns in the codebase",
				parameters: {
					type: "object",
					properties: {
						pattern: { type: "string", description: "Search pattern (regex supported)" },
						fileTypes: { type: "array", items: { type: "string" }, description: "File extensions to search (e.g., ['ts', 'js'])" },
						caseSensitive: { type: "boolean", description: "Case sensitive search (default: false)" }
					},
					required: ["pattern"]
				},
				execute: async (params) => {
					try {
						const flags = params.caseSensitive ? "g" : "gi";
						const regex = new RegExp(params.pattern, flags);
						const results: Array<{ file: string; line: number; content: string; match: string }> = [];
						
						const searchDir = async (dir: string) => {
							const entries = await readdir(dir);
							for (const entry of entries) {
								const fullPath = join(dir, entry);
								const stats = await stat(fullPath);
								
								if (stats.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
									await searchDir(fullPath);
								} else if (stats.isFile()) {
									const ext = extname(entry).slice(1);
									if (!params.fileTypes || params.fileTypes.includes(ext)) {
										try {
											const content = await readFile(fullPath, "utf8");
											const lines = content.split('\n');
											lines.forEach((line, index) => {
												const match = line.match(regex);
												if (match) {
													results.push({
														file: fullPath.replace(this.repoRoot, '').replace(/^\//, ''),
														line: index + 1,
														content: line.trim(),
														match: match[0]
													});
												}
											});
										} catch (e) {
											// Skip files that can't be read as text
										}
									}
								}
							}
						};
						
						await searchDir(this.repoRoot);
						return { success: true, data: { results, pattern: params.pattern }, output: `Found ${results.length} matches for "${params.pattern}"` };
					} catch (error) {
						return { success: false, error: String(error) };
					}
				}
			},

			// Testing & Quality
			{
				name: "run_tests",
				description: "Execute test suite (Jest/Mocha autodetect)",
				parameters: {
					type: "object",
					properties: {
						pattern: { type: "string", description: "Test file pattern (optional)" }
					}
				},
				execute: async (params) => {
					try {
						const results = await this.testRunner.runAll();
						return { 
							success: true, 
							data: results, 
							output: `Tests completed: ${results.passed} passed, ${results.failed} failed, ${results.skipped} skipped` 
						};
					} catch (error) {
						return { success: false, error: String(error) };
					}
				}
			},
			{
				name: "format_code",
				description: "Format code using project formatters",
				parameters: {
					type: "object",
					properties: {
						filePath: { type: "string", description: "Specific file to format (optional, formats all if not specified)" }
					}
				},
				execute: async (params) => {
					try {
						const result = await this.formatter.run();
						return { success: true, output: params.filePath ? `Formatted ${params.filePath}` : `Formatted ${result.filesChanged} files` };
					} catch (error) {
						return { success: false, error: String(error) };
					}
				}
			},

			// Project Information
			{
				name: "get_project_structure",
				description: "Get an overview of the project structure",
				parameters: { type: "object", properties: {} },
				execute: async () => {
					try {
						const structure = await this.buildProjectTree(this.repoRoot);
						return { success: true, data: { structure }, output: "Retrieved project structure" };
					} catch (error) {
						return { success: false, error: String(error) };
					}
				}
			},
			{
				name: "get_package_info",
				description: "Get package.json information",
				parameters: { type: "object", properties: {} },
				execute: async () => {
					try {
						const packagePath = resolve(this.repoRoot, "package.json");
						const content = await readFile(packagePath, "utf8");
						const packageInfo = JSON.parse(content);
						return { 
							success: true, 
							data: { 
								name: packageInfo.name,
								version: packageInfo.version,
								description: packageInfo.description,
								dependencies: packageInfo.dependencies,
								devDependencies: packageInfo.devDependencies,
								scripts: packageInfo.scripts
							}, 
							output: `Package: ${packageInfo.name}@${packageInfo.version}` 
						};
					} catch (error) {
						return { success: false, error: String(error) };
					}
				}
			}
		];
	}

	private async buildProjectTree(dir: string, depth = 0, maxDepth = 3): Promise<any> {
		if (depth > maxDepth) return null;
		
		try {
			const entries = await readdir(dir);
			const tree: any = {};
			
			for (const entry of entries.slice(0, 20)) { // Limit entries to prevent huge trees
				if (entry.startsWith('.') && entry !== '.env' && entry !== '.gitignore') continue;
				if (entry === 'node_modules') continue;
				
				const fullPath = join(dir, entry);
				const stats = await stat(fullPath);
				
				if (stats.isDirectory()) {
					tree[entry] = await this.buildProjectTree(fullPath, depth + 1, maxDepth);
				} else {
					tree[entry] = {
						type: 'file',
						size: stats.size,
						ext: extname(entry)
					};
				}
			}
			
			return tree;
		} catch (error) {
			return null;
		}
	}

	async executeTool(toolName: string, parameters: any): Promise<ToolResult> {
		const tools = this.getAvailableTools();
		const tool = tools.find(t => t.name === toolName);
		
		if (!tool) {
			return { success: false, error: `Tool '${toolName}' not found` };
		}
		
		this.log.info({ toolName, parameters }, "Executing tool");
		
		try {
			const result = await tool.execute(parameters);
			this.log.info({ toolName, success: result.success }, "Tool execution completed");
			return result;
		} catch (error) {
			this.log.error({ toolName, error }, "Tool execution failed");
			return { success: false, error: String(error) };
		}
	}
}

export default ToolCaller;