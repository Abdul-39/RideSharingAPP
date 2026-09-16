import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/auth.models';

export interface DocumentMetaDto {
  id: string;
  documentType: string;
  fileName: string;
  status: string;
  fileSizeBytes: number;
  createdAt: string;
  canDownload: boolean;
}

export interface VerificationRequestDto {
  id: string;
  userId: string;
  userName: string;
  email: string;
  status: string;
  studentOrEmployeeId?: string;
  institutionId?: string;
  institutionName?: string;
  cnicLast4?: string;
  hasCnicOnFile: boolean;
  applicantNote?: string;
  adminNote?: string;
  createdAt: string;
  reviewedAt?: string;
  documents: DocumentMetaDto[];
}

export interface MyVerificationStatusDto {
  isVerified: boolean;
  cnicLast4?: string;
  studentOrEmployeeId?: string;
  institutionId?: string;
  institutionName?: string;
  latestRequest?: VerificationRequestDto;
}

@Injectable({ providedIn: 'root' })
export class VerificationService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/verification`;

  myStatus(): Observable<ApiResponse<MyVerificationStatusDto>> {
    return this.http.get<ApiResponse<MyVerificationStatusDto>>(`${this.base}/me`);
  }

  institutions(): Observable<ApiResponse<{ id: string; name: string; type: string }[]>> {
    return this.http.get<ApiResponse<{ id: string; name: string; type: string }[]>>(`${this.base}/institutions`);
  }

  submit(body: {
    studentOrEmployeeId?: string;
    institutionId?: string;
    cnic?: string;
    applicantNote?: string;
  }) {
    return this.http.post<ApiResponse<VerificationRequestDto>>(`${this.base}/requests`, body);
  }

  upload(file: File, documentType: string, requestId?: string) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('documentType', documentType);
    if (requestId) fd.append('requestId', requestId);
    return this.http.post<ApiResponse<DocumentMetaDto>>(`${this.base}/documents`, fd);
  }

  adminList(status?: string) {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.http.get<ApiResponse<VerificationRequestDto[]>>(`${this.base}/admin/requests${q}`);
  }

  adminReview(id: string, decision: string, adminNote?: string) {
    return this.http.post<ApiResponse<VerificationRequestDto>>(
      `${this.base}/admin/requests/${id}/review`,
      { decision, adminNote }
    );
  }
}