import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { LogEntry } from './logger';

export class LogViewer {
    private logDir: string;

    constructor() {
        this.logDir = join(process.cwd(), 'logs');
    }

    listLogFiles(): string[] {
        if (!existsSync(this.logDir)) {
            console.log('No logs directory found');
            return [];
        }

        const files = readdirSync(this.logDir)
            .filter(file => file.endsWith('.json'))
            .sort((a, b) => b.localeCompare(a)); // Most recent first

        return files;
    }

    readLogFile(filename: string): LogEntry[] {
        const filePath = join(this.logDir, filename);
        
        if (!existsSync(filePath)) {
            throw new Error(`Log file not found: ${filename}`);
        }

        try {
            const content = readFileSync(filePath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            throw new Error(`Failed to read log file: ${error}`);
        }
    }

    showLogSummary(filename: string): void {
        try {
            const entries = this.readLogFile(filename);
            
            console.log(`\n📊 Log Summary: ${filename}`);
            console.log('=' .repeat(50));
            
            const totalEntries = entries.length;
            const successfulEntries = entries.filter(entry => entry.success).length;
            const failedEntries = totalEntries - successfulEntries;
            
            console.log(`Total Entries: ${totalEntries}`);
            console.log(`Successful: ${successfulEntries} ✅`);
            console.log(`Failed: ${failedEntries} ❌`);
            
            // Group by action
            const actionStats = entries.reduce((acc, entry) => {
                acc[entry.action] = (acc[entry.action] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
            
            console.log('\nActions:');
            Object.entries(actionStats).forEach(([action, count]) => {
                console.log(`  ${action}: ${count}`);
            });
            
            // Show recent entries
            console.log('\nRecent Entries:');
            entries.slice(-5).forEach((entry, index) => {
                const status = entry.success ? '✅' : '❌';
                const time = new Date(entry.timestamp).toLocaleString();
                console.log(`  ${index + 1}. ${time} - ${entry.action} ${status}`);
                if (!entry.success && entry.error) {
                    console.log(`     Error: ${entry.error}`);
                }
            });
            
        } catch (error) {
            console.error(`Failed to show log summary: ${error}`);
        }
    }

    showDetailedLog(filename: string): void {
        try {
            const entries = this.readLogFile(filename);
            
            console.log(`\n📋 Detailed Log: ${filename}`);
            console.log('=' .repeat(50));
            
            entries.forEach((entry, index) => {
                const status = entry.success ? '✅' : '❌';
                const time = new Date(entry.timestamp).toLocaleString();
                
                console.log(`\n${index + 1}. ${time} - ${entry.action} ${status}`);
                console.log(`   Playground: ${entry.playground}`);
                
                if (entry.data) {
                    console.log(`   Data: ${JSON.stringify(entry.data, null, 2)}`);
                }
                
                if (!entry.success && entry.error) {
                    console.log(`   Error: ${entry.error}`);
                }
            });
            
        } catch (error) {
            console.error(`Failed to show detailed log: ${error}`);
        }
    }

    showFailedEntries(filename: string): void {
        try {
            const entries = this.readLogFile(filename);
            const failedEntries = entries.filter(entry => !entry.success);
            
            console.log(`\n❌ Failed Entries: ${filename}`);
            console.log('=' .repeat(50));
            
            if (failedEntries.length === 0) {
                console.log('No failed entries found');
                return;
            }
            
            failedEntries.forEach((entry, index) => {
                const time = new Date(entry.timestamp).toLocaleString();
                console.log(`\n${index + 1}. ${time} - ${entry.action}`);
                console.log(`   Playground: ${entry.playground}`);
                console.log(`   Error: ${entry.error}`);
            });
            
        } catch (error) {
            console.error(`Failed to show failed entries: ${error}`);
        }
    }

    showSuccessfulEntries(filename: string): void {
        try {
            const entries = this.readLogFile(filename);
            const successfulEntries = entries.filter(entry => entry.success);
            
            console.log(`\n✅ Successful Entries: ${filename}`);
            console.log('=' .repeat(50));
            
            if (successfulEntries.length === 0) {
                console.log('No successful entries found');
                return;
            }
            
            successfulEntries.forEach((entry, index) => {
                const time = new Date(entry.timestamp).toLocaleString();
                console.log(`\n${index + 1}. ${time} - ${entry.action}`);
                console.log(`   Playground: ${entry.playground}`);
                
                if (entry.data) {
                    // Show a summary of the data
                    const dataSummary = this.summarizeData(entry.data);
                    console.log(`   Data: ${dataSummary}`);
                }
            });
            
        } catch (error) {
            console.error(`Failed to show successful entries: ${error}`);
        }
    }

    private summarizeData(data: any): string {
        if (typeof data === 'string') {
            return data.length > 100 ? data.substring(0, 100) + '...' : data;
        }
        
        if (typeof data === 'object') {
            const keys = Object.keys(data);
            if (keys.length === 0) return '{}';
            
            const summary = keys.slice(0, 3).map(key => {
                const value = data[key];
                if (typeof value === 'string') {
                    return `${key}: "${value.substring(0, 20)}..."`;
                }
                if (typeof value === 'number') {
                    return `${key}: ${value}`;
                }
                return `${key}: ${typeof value}`;
            }).join(', ');
            
            return keys.length > 3 ? `{${summary}, ...}` : `{${summary}}`;
        }
        
        return String(data);
    }
}

// CLI interface
if (require.main === module) {
    const viewer = new LogViewer();
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Available log files:');
        const files = viewer.listLogFiles();
        if (files.length === 0) {
            console.log('No log files found');
        } else {
            files.forEach(file => console.log(`  ${file}`));
        }
        console.log('\nUsage:');
        console.log('  bun run logViewer <filename> [summary|detailed|failed|successful]');
        return;
    }
    
    const filename = args[0];
    const command = args[1] || 'summary';
    
    try {
        switch (command) {
            case 'summary':
                viewer.showLogSummary(filename);
                break;
            case 'detailed':
                viewer.showDetailedLog(filename);
                break;
            case 'failed':
                viewer.showFailedEntries(filename);
                break;
            case 'successful':
                viewer.showSuccessfulEntries(filename);
                break;
            default:
                console.log('Invalid command. Use: summary, detailed, failed, or successful');
        }
    } catch (error) {
        console.error(`Error: ${error}`);
    }
} 