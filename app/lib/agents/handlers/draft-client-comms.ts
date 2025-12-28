import { AgentHandler } from '../types';
import { ClientCommunication, RedTeamIssue } from '../domain';

interface DraftClientCommsInput {
  review_results: {
    overall_status: string;
    issues: RedTeamIssue[];
    critical_count?: number;
    high_count?: number;
  };
  tone: 'formal' | 'friendly' | 'urgent';
  language: string;
  client_name?: string;
}

interface DraftClientCommsOutput extends ClientCommunication {}

export const draftClientCommsHandler: AgentHandler<DraftClientCommsInput, DraftClientCommsOutput> = async (input, context) => {
  if (context.mode === 'fake') {
    const { review_results, tone, language, client_name } = input;
    const clientGreeting = client_name ? `Dear ${client_name}` : 'Dear Valued Client';

    // Language-specific messages
    const messages: Record<string, any> = {
      english: {
        greeting: clientGreeting,
        subject_pass: 'Your Investment Proposal - Approved',
        subject_review: 'Your Investment Proposal - Additional Information Required',
        subject_fail: 'Your Investment Proposal - Action Required',
        closing_formal: 'Sincerely,\nCompliance Review Team',
        closing_friendly: 'Best regards,\nYour Investment Team',
        closing_urgent: 'Urgent attention required.\n\nCompliance Team',
      },
      chinese: {
        greeting: `尊敬的${client_name || '客户'}`,
        subject_pass: '您的投资建议书 - 已批准',
        subject_review: '您的投资建议书 - 需要补充信息',
        subject_fail: '您的投资建议书 - 需要立即处理',
        closing_formal: '此致\n敬礼\n合规审查团队',
        closing_friendly: '祝好\n您的投资团队',
        closing_urgent: '需要紧急关注。\n\n合规团队',
      },
      german: {
        greeting: `Sehr geehrte/r ${client_name || 'Kunde/Kundin'}`,
        subject_pass: 'Ihr Investitionsvorschlag - Genehmigt',
        subject_review: 'Ihr Investitionsvorschlag - Zusätzliche Informationen erforderlich',
        subject_fail: 'Ihr Investitionsvorschlag - Maßnahmen erforderlich',
        closing_formal: 'Mit freundlichen Grüßen,\nCompliance-Prüfungsteam',
        closing_friendly: 'Beste Grüße,\nIhr Investmentteam',
        closing_urgent: 'Dringende Aufmerksamkeit erforderlich.\n\nCompliance-Team',
      },
      french: {
        greeting: `Cher/Chère ${client_name || 'client'}`,
        subject_pass: 'Votre proposition d\'investissement - Approuvée',
        subject_review: 'Votre proposition d\'investissement - Informations supplémentaires requises',
        subject_fail: 'Votre proposition d\'investissement - Action requise',
        closing_formal: 'Cordialement,\nÉquipe de conformité',
        closing_friendly: 'Meilleures salutations,\nVotre équipe d\'investissement',
        closing_urgent: 'Attention urgente requise.\n\nÉquipe de conformité',
      },
      japanese: {
        greeting: `${client_name || 'お客様'}へ`,
        subject_pass: '投資提案書 - 承認されました',
        subject_review: '投資提案書 - 追加情報が必要です',
        subject_fail: '投資提案書 - 対応が必要です',
        closing_formal: '敬具\nコンプライアンス審査チーム',
        closing_friendly: 'よろしくお願いいたします\n投資チーム',
        closing_urgent: '緊急の対応が必要です。\n\nコンプライアンスチーム',
      },
    };

    const lang = messages[language] || messages.english;
    let subject = '';
    let body = '';
    let callToAction = '';
    let urgencyLevel: 'immediate' | 'high' | 'medium' | 'low' = 'medium';
    const attachmentSuggestions: string[] = [];

    // Determine status and build message
    if (review_results.overall_status === 'pass') {
      subject = lang.subject_pass;
      urgencyLevel = 'low';
      
      body = `${lang.greeting},

We are pleased to inform you that your investment proposal has been reviewed and approved. All compliance requirements have been satisfied.

Your proposal meets all regulatory standards and internal policy requirements. You may proceed with the next steps as outlined in your agreement.

${tone === 'formal' ? lang.closing_formal : lang.closing_friendly}`;
      
      callToAction = 'Please review the attached approval document and proceed with implementation.';
      attachmentSuggestions.push('Approval Certificate', 'Next Steps Guide');

    } else if (review_results.overall_status === 'needs_review' || review_results.overall_status === 'fail') {
      const isFail = review_results.overall_status === 'fail';
      subject = isFail ? lang.subject_fail : lang.subject_review;
      urgencyLevel = isFail ? 'immediate' : 'high';

      const criticalCount = review_results.critical_count || 0;
      const highCount = review_results.high_count || 0;
      const issueCount = review_results.issues.length;

      body = `${lang.greeting},

Thank you for submitting your investment proposal. Our compliance review has identified ${issueCount} item(s) that require your attention:

${criticalCount > 0 ? `- ${criticalCount} critical issue(s) requiring immediate action\n` : ''}${highCount > 0 ? `- ${highCount} high-priority item(s)\n` : ''}
Key Issues:
${review_results.issues.slice(0, 3).map((issue, idx) => 
  `${idx + 1}. ${issue.description}`
).join('\n')}${issueCount > 3 ? `\n... and ${issueCount - 3} more (see attached details)` : ''}

${isFail ? 'These issues must be resolved before we can proceed with your proposal.' : 'Please address these items at your earliest convenience.'}

${tone === 'urgent' ? lang.closing_urgent : tone === 'formal' ? lang.closing_formal : lang.closing_friendly}`;

      callToAction = isFail 
        ? 'Please provide the required information within 24 hours to avoid processing delays.'
        : 'Please review the attached details and respond with the requested information.';
      
      attachmentSuggestions.push('Detailed Review Report', 'Required Documentation Checklist');
      if (criticalCount > 0) {
        attachmentSuggestions.push('Critical Issues Summary');
      }
    }

    return {
      subject,
      body,
      tone,
      language,
      call_to_action: callToAction,
      attachment_suggestions: attachmentSuggestions,
      urgency_level: urgencyLevel,
    };
  }

  throw new Error('Real draft-client-comms not implemented yet.');
};

