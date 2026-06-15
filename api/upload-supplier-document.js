import { getSupplierByAccreditationToken } from './lib/supplierToken.js';
import {
  SUPPLIER_DOCUMENTS_BUCKET,
  buildSupplierDocumentStoragePath,
} from '../src/utils/storagePaths.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx']);

function parseMultipartBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function extractMultipartFields(buffer, boundary) {
  const text = buffer.toString('binary');
  const parts = text.split(`--${boundary}`);
  const fields = {};
  let file = null;

  parts.forEach((part) => {
    if (!part || part === '--\r\n' || part === '--') {
      return;
    }

    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) {
      return;
    }

    const headers = part.slice(0, headerEnd);
    const body = part.slice(headerEnd + 4).replace(/\r\n$/, '');

    const nameMatch = headers.match(/name="([^"]+)"/);
    const filenameMatch = headers.match(/filename="([^"]+)"/);
    const fieldName = nameMatch?.[1];

    if (!fieldName) {
      return;
    }

    if (filenameMatch) {
      const contentTypeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/i);
      file = {
        filename: filenameMatch[1],
        contentType: contentTypeMatch?.[1] || 'application/octet-stream',
        data: Buffer.from(body, 'binary'),
      };
      return;
    }

    fields[fieldName] = Buffer.from(body, 'binary').toString('utf8');
  });

  return { fields, file };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Supabase service role is not configured on the server' });
  }

  try {
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(.+)$/);
    if (!boundaryMatch) {
      return res.status(400).json({ error: 'Expected multipart form data' });
    }

    const buffer = await parseMultipartBody(req);
    const { fields, file } = extractMultipartFields(buffer, boundaryMatch[1]);

    const token = fields.token;
    const supplierId = fields.supplierId;
    const documentType = fields.documentType || 'document';

    if (!token && !supplierId) {
      return res.status(400).json({ error: 'token or supplierId is required' });
    }

    if (!file?.data?.length) {
      return res.status(400).json({ error: 'file is required' });
    }

    if (file.data.length > MAX_FILE_SIZE_BYTES) {
      return res.status(400).json({ error: 'File exceeds 50MB limit' });
    }

    const extension = file.filename.split('.').pop()?.toLowerCase() || 'bin';
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    let supplier;

    if (token) {
      const result = await getSupplierByAccreditationToken(token);
      if (result.error) {
        return res.status(result.status || 400).json({ error: result.error });
      }
      supplier = result.supplier;
    } else {
      const supplierResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/suppliers?id=eq.${supplierId}&select=*&limit=1`,
        {
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }
      );

      if (!supplierResponse.ok) {
        const errorText = await supplierResponse.text();
        return res.status(supplierResponse.status).json({ error: `Failed to load supplier: ${errorText}` });
      }

      const suppliers = await supplierResponse.json();
      supplier = suppliers[0];

      if (!supplier) {
        return res.status(404).json({ error: 'Supplier not found' });
      }
    }

    const storagePath = buildSupplierDocumentStoragePath({
      companyName: supplier.company_name,
      documentType,
      fileExt: extension,
    });

    const uploadResponse = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${SUPPLIER_DOCUMENTS_BUCKET}/${storagePath}`,
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': file.contentType,
          'x-upsert': 'false',
        },
        body: file.data,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Failed to upload supplier document:', errorText);
      if (errorText.includes('Bucket not found')) {
        return res.status(500).json({
          error: `Storage bucket "${SUPPLIER_DOCUMENTS_BUCKET}" is not configured. Run setup-supplier-storage-bucket.js or create the bucket in Supabase.`,
        });
      }
      return res.status(uploadResponse.status).json({ error: 'Failed to upload document' });
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${SUPPLIER_DOCUMENTS_BUCKET}/${storagePath}`;

    return res.status(200).json({
      success: true,
      url: publicUrl,
      path: storagePath,
      bucket: SUPPLIER_DOCUMENTS_BUCKET,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('upload-supplier-document error:', error);
    return res.status(500).json({ error: error.message || 'Failed to upload document' });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
