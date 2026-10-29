import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import type { PeladaRulesFormValues } from './pelada-rules.model';
import {
  peladaRulesFromApi,
  peladaRulesToPatchBody,
  type PeladaRulesApiDto,
} from './pelada-rules-api.mapper';

@Injectable({ providedIn: 'root' })
export class PeladaRulesApiService {
  private readonly http = inject(HttpClient);

  fetchRules(peladaId: string) {
    return this.http.get<PeladaRulesApiDto>(
      `${environment.apiUrl}/peladas/${peladaId}/rules`,
    );
  }

  saveRules(peladaId: string, values: PeladaRulesFormValues) {
    return this.http.patch<PeladaRulesApiDto>(
      `${environment.apiUrl}/peladas/${peladaId}/rules`,
      peladaRulesToPatchBody(values),
    );
  }

  mapFromApi(dto: PeladaRulesApiDto): PeladaRulesFormValues {
    return peladaRulesFromApi(dto);
  }
}
