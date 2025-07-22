import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface LogEntry {
    timestamp: string;
    playground: string;
    action: string;
    data: any;
    success: boolean;
    error?: string;
}

export class Logger {
    private logDir: string;
    private logFile: string;

    constructor(playgroundName: string) {
        this.logDir = join(process.cwd(), 'logs');
        this.logFile = join(this.logDir, `${playgroundName}_${this.getDateString()}.json`);
        
        // Ensure log directory exists
        if (!existsSync(this.logDir)) {
            mkdirSync(this.logDir, { recursive: true });
        }
    }

    private getDateString(): string {
        const now = new Date();
        return now.toLocaleDateString('pt-BR', { 
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).split('/').reverse().join('-'); // Converte DD/MM/YYYY para YYYY-MM-DD
    }

    private getTimestamp(): string {
        const now = new Date();
        return now.toLocaleString('pt-BR', { 
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3
        });
    }

    log(action: string, data: any, success: boolean = true, error?: string): void {
        const entry: LogEntry = {
            timestamp: this.getTimestamp(),
            playground: this.logFile.split('/').pop()?.split('_')[0] || 'unknown',
            action,
            data,
            success,
            error
        };

        try {
            // Read existing logs or create new array
            let logs: LogEntry[] = [];
            if (existsSync(this.logFile)) {
                const existingContent = readFileSync(this.logFile, 'utf8');
                try {
                    logs = JSON.parse(existingContent);
                } catch {
                    logs = [];
                }
            }

            // Add new entry
            logs.push(entry);

            // Write back to file
            writeFileSync(this.logFile, JSON.stringify(logs, null, 2));
            
            console.log(`📝 Logged: ${action} - ${success ? '✅' : '❌'}`);
        } catch (err) {
            console.error('Failed to write log:', err);
        }
    }

    logStrategy(contractAddress: string, strategy: any, success: boolean = true, error?: string): void {
        this.log('strategy_query', {
            contractAddress,
            strategy,
            denom: 'ruji',
            amount: '1000000'
        }, success, error);
    }

    logQuote(contractAddress: string, quote: any, offerDenom: string, askDenom: string, success: boolean = true, error?: string): void {
        this.log('quote_query', {
            contractAddress,
            quote,
            offerDenom,
            askDenom,
            amount: '1000000'
        }, success, error);
    }

    logConfig(contractAddress: string, config: any, success: boolean = true, error?: string): void {
        this.log('config_query', {
            contractAddress,
            config
        }, success, error);
    }

    logState(contractAddress: string, state: any, success: boolean = true, error?: string): void {
        this.log('state_query', {
            contractAddress,
            state
        }, success, error);
    }

    logNetworkStatus(rpcEndpoint: string, chainId: string, height: number, success: boolean = true, error?: string): void {
        this.log('network_status', {
            rpcEndpoint,
            chainId,
            height
        }, success, error);
    }

    getLogFilePath(): string {
        return this.logFile;
    }
} 