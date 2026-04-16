export interface PathVariables {
    [key: string]: string;
    path: string;
    notename: string;
    notenameWithoutExt: string;
    date: string;
    time: string;
    originalName: string;
    random: string;
    year: string;
    month: string;
    day: string;
    hour: string;
    minute: string;
    second: string;
}

export function generatePathVariables(documentPath: string): PathVariables {
    const now = new Date();
    const filename = documentPath.split('/').pop() || 'untitled';
    // Extract directory path by removing the filename
    const pathParts = documentPath.split('/');
    pathParts.pop(); // Remove the filename
    const directoryPath = pathParts.join('/');
    // Remove .md extension from filename
    const notenameWithoutExt = filename.replace(/\.md$/i, '');
    
    return {
        path: directoryPath,
        notename: filename,
        notenameWithoutExt: notenameWithoutExt,
        date: now.toISOString().split('T')[0],
        time: now.toISOString().split('T')[1].split('.')[0].replace(/:/g, '-'),
        originalName: filename,
        random: simpleHash(filename),
        year: now.getFullYear().toString(),
        month: (now.getMonth() + 1).toString().padStart(2, '0'),
        day: now.getDate().toString().padStart(2, '0'),
        hour: now.getHours().toString().padStart(2, '0'),
        minute: now.getMinutes().toString().padStart(2, '0'),
        second: now.getSeconds().toString().padStart(2, '0'),
    };
}

// Simple hash function (reused from your existing code)
function simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}
