import '../apps/api/src/config.js';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,writeFile,readFile,readdir,unlink,lstat,realpath} from 'node:fs/promises';
import {randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
import {resolve,basename,sep} from 'node:path';
const run=promisify(execFile),key=process.env.BACKUP_KEY;
if(!/^[a-f\d]{64}$/i.test(key??''))throw new Error('BACKUP_KEY must be 64 hex characters');
const directory=resolve('backups');await mkdir(directory,{recursive:true});
const container=process.env.BACKUP_CONTAINER;
if(container&&!/^polylove-[a-z0-9-]+$/.test(container))throw new Error('Invalid task container name');
const dockerArgs=container?['exec','-i',container]:['compose','--env-file','.env','-f','deploy/compose.yml','exec','-T','postgres'];
if(process.argv[2]==='verify'){
 const file=await realpath(resolve(process.argv[3]??''));if(!file.startsWith((await realpath(directory))+sep))throw new Error('Backup must be in backups directory');
 const bytes=await readFile(file),d=createDecipheriv('aes-256-gcm',Buffer.from(key,'hex'),bytes.subarray(0,12));d.setAuthTag(bytes.subarray(12,28));const dump=Buffer.concat([d.update(bytes.subarray(28)),d.final()]);
 const database=process.env.RESTORE_TEST_DB;if(!/^polylove_restore_test_[a-z0-9_]+$/.test(database??''))throw new Error('Use RESTORE_TEST_DB=polylove_restore_test_<unique suffix>');
 await run('docker',[...dockerArgs,'createdb','-U','polylove',database]);
 await new Promise((res,rej)=>{const p=spawn('docker',[...dockerArgs,'pg_restore','-U','polylove','--exit-on-error','-d',database],{windowsHide:true});p.stdout.resume();p.stderr.resume();p.stdin.on('error',rej);p.on('error',rej);p.on('close',code=>code===0?res():rej(new Error('Restore failed')));p.stdin.end(dump);});
 await run('docker',[...dockerArgs,'psql','-U','polylove','-d',database,'-v','ON_ERROR_STOP=1','-c','SELECT count(*) FROM users; SELECT count(*) FROM candles;']);console.log('Restore verified in '+database+' (retained for inspection)');
}else{
 const {stdout}=await run('docker',[...dockerArgs,'pg_dump','-U','polylove','-Fc','polylove'],{encoding:'buffer',maxBuffer:100*1024*1024});
 const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',Buffer.from(key,'hex'),iv),encrypted=Buffer.concat([c.update(stdout),c.final()]);const file=resolve(directory,`polylove-${new Date().toISOString().replace(/[:.]/g,'-')}.backup`);await writeFile(file,Buffer.concat([iv,c.getAuthTag(),encrypted]),{mode:0o600});
 if(process.argv[2]==='local'){console.log('Local encrypted test backup: '+file);process.exit(0);}
 const target=process.env.BACKUP_SSH_TARGET;if(!/^[a-z0-9_][\w.-]*@[a-z0-9][\w.-]*:\/var\/backups\/polylove-crypto\/?$/i.test(target??''))throw new Error('Set BACKUP_SSH_TARGET=user@host:/var/backups/polylove-crypto (local backup retained)');
 await run('scp',['-o','BatchMode=yes',file,target]);
 // Fixed dedicated remote directory; delete only generated backup names older than seven days.
 await run('ssh',['-o','BatchMode=yes',target.split(':')[0],"find /var/backups/polylove-crypto -maxdepth 1 -type f -name 'polylove-????-??-??T??-??-??-???Z.backup' -mtime +6 -delete"]);
 for(const name of await readdir(directory)){if(!/^polylove-\d{4}-\d{2}-\d{2}T[\d-]+Z\.backup$/.test(name))continue;const path=resolve(directory,name),stat=await lstat(path);if(stat.isFile()&&!stat.isSymbolicLink()&&stat.mtimeMs<Date.now()-7*86400000)await unlink(path);}
 console.log('Encrypted offsite backup completed: '+basename(file));
}
