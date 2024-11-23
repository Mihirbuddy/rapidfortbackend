const express = require('express');
const multer = require('multer');
const { PDFDocument } = require('pdf-lib');
const docxToPdf = require('docx-pdf');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { exec } = require('child_process'); // Import exec to run shell commands

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors()); // Enable CORS for all routes
app.use(express.json());

// Serve static files from the 'uploads' folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.post('/upload', upload.single('file'), async (req, res) => {
    const { path: tempPath, originalname } = req.file;
    const password = req.body.password || null; // Get password from request body

    // Log request body and password for debugging
    console.log('Received password:', password);
    console.log('Request body:', req.body);

    try {
        // Sanitize filename
        const safeFilename = originalname.replace(/\s+/g, '_').replace(/[^\w.-]/g, '').toLowerCase();
        const pdfPath = path.join('uploads', `${safeFilename.replace('.docx', '')}.pdf`);
        const encryptedPdfPath = path.join('uploads', `${safeFilename.replace('.docx', '')}-protected.pdf`);

        // Convert DOCX to PDF
        await new Promise((resolve, reject) =>
            docxToPdf(tempPath, pdfPath, (err) => {
                if (err) {
                    console.error('Error converting DOCX to PDF:', err);
                    reject(new Error('Error converting DOCX to PDF'));
                } else {
                    resolve();
                }
            })
        );

        // If password is provided, encrypt the PDF using qpdf
        if (password) {
            await encryptPdfWithQpdf(pdfPath, encryptedPdfPath, password);

            // Delete the unencrypted PDF after encryption
            fs.unlinkSync(pdfPath);

            return res.status(200).json({
                pdfUrl: `http://localhost:5001/uploads/${path.basename(encryptedPdfPath)}`,
            });
        }

        // If no password is provided, send the unencrypted PDF
        res.status(200).json({
            pdfUrl: `http://localhost:5001/uploads/${path.basename(pdfPath)}`,
        });
    } catch (error) {
        console.error('Error processing file:', error.message || error);
        res.status(500).json({ message: 'Error converting file', error: error.message || error });
    } finally {
        // Clean up the temporary uploaded file
        if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
        }
    }
});

// Function to encrypt PDF using qpdf
const encryptPdfWithQpdf = (inputPath, outputPath, password) => {
    return new Promise((resolve, reject) => {
        if (!password) {
            reject(new Error('Password is required for encryption'));
        }

        // Construct the qpdf command
        const qpdfCommand = `qpdf ${inputPath} --encrypt ${password} ${password} 256 -- ${outputPath}`;

        // Log before running the command
        console.log('Running command:', qpdfCommand);

        // Run the qpdf command using exec
        exec(qpdfCommand, (error, stdout, stderr) => {
            if (error) {
                console.error('Error encrypting PDF with qpdf:', stderr || error);
                reject(new Error('Error encrypting PDF with qpdf'));
            } else {
                console.log('qpdf command output:', stdout);
                resolve();
            }
        });
    });
};

// Start the server
const PORT = 5001;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
