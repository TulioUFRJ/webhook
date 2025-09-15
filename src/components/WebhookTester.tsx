import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Upload, Send, FileText, Download } from 'lucide-react';

interface WebhookResponse {
  status: number;
  data: any;
  headers: Record<string, string>;
  isFile?: boolean;
  fileName?: string;
  contentType?: string;
}

export const WebhookTester = () => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<WebhookResponse | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const sendWebhook = async () => {
    if (!webhookUrl || !selectedFile) {
      toast({
        title: 'Erro',
        description: 'Por favor, preencha a URL e selecione um arquivo',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        body: formData,
      });

      const contentType = res.headers.get('content-type') || '';
      const isFile = contentType.includes('application/') && 
                    !contentType.includes('json') && 
                    !contentType.includes('text');

      let data;
      let fileName = '';

      if (isFile) {
        const blob = await res.blob();
        data = blob;
        const disposition = res.headers.get('content-disposition');
        if (disposition) {
          const match = disposition.match(/filename="?([^"]+)"?/);
          fileName = match ? match[1] : 'download';
        }
      } else if (contentType.includes('json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      const headers: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        headers[key] = value;
      });

      setResponse({
        status: res.status,
        data,
        headers,
        isFile,
        fileName,
        contentType,
      });

      toast({
        title: 'Sucesso!',
        description: `Webhook enviado - Status: ${res.status}`,
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao enviar webhook',
        variant: 'destructive',
      });
      console.error('Erro:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadFile = () => {
    if (response?.isFile && response.data instanceof Blob) {
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.fileName || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/50 p-6">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Webhook Tester
          </h1>
          <p className="text-muted-foreground">
            Teste seus webhooks enviando arquivos e visualize as respostas
          </p>
        </div>

        {/* Input Section */}
        <Card className="p-6 bg-gradient-card backdrop-blur-sm border-border/50 shadow-card">
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-2 block">URL do Webhook</label>
              <Input
                type="url"
                placeholder="https://seu-webhook.com/endpoint"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="bg-background/50 border-border/50 focus:border-primary"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Arquivo</label>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 cursor-pointer ${
                  isDragging
                    ? 'border-primary bg-primary/5 shadow-glow'
                    : 'border-border/50 hover:border-primary/50 hover:bg-accent/20'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Upload className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
                {selectedFile ? (
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(selectedFile.size)} • {selectedFile.type || 'Tipo desconhecido'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-foreground">Arraste um arquivo aqui ou clique para selecionar</p>
                    <p className="text-sm text-muted-foreground">
                      Suporta PDF, imagens, áudio, Excel, CSV e mais
                    </p>
                  </div>
                )}
              </div>
            </div>

            <Button
              onClick={sendWebhook}
              disabled={!webhookUrl || !selectedFile || isLoading}
              className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Webhook
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Response Section */}
        {response && (
          <Card className="p-6 bg-gradient-card backdrop-blur-sm border-border/50 shadow-card">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Resposta</h3>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  response.status >= 200 && response.status < 300
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  Status: {response.status}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2 text-sm text-muted-foreground">Headers</h4>
                  <div className="bg-background/50 rounded p-3 max-h-48 overflow-auto">
                    <pre className="text-xs">
                      {JSON.stringify(response.headers, null, 2)}
                    </pre>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2 text-sm text-muted-foreground">Conteúdo</h4>
                  <div className="bg-background/50 rounded p-3 max-h-48 overflow-auto">
                    {response.isFile ? (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4" />
                          <span className="text-sm">
                            Arquivo: {response.fileName || 'download'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Tipo: {response.contentType}
                        </p>
                        <Button
                          onClick={downloadFile}
                          size="sm"
                          variant="outline"
                          className="mt-2"
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Baixar
                        </Button>
                      </div>
                    ) : (
                      <pre className="text-xs whitespace-pre-wrap">
                        {typeof response.data === 'string' 
                          ? response.data 
                          : JSON.stringify(response.data, null, 2)
                        }
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};