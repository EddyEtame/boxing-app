import { useT } from '@/i18n';
import { IconChat, IconInfo, IconUsers } from '@/ui/icons';
import { Page } from '@/ui/Page';

import { MembersOnly } from './common/MembersOnly';

const GROUPE = require('@/assets/photos/groupe-fresque.jpg');

export function Locked({ statut }: { statut: 'invite' | 'restreint' }) {
  const T = useT();
  return (
    <Page title={T('messages.title')} subtitle={T('messages.lockedSub')}>
      <MembersOnly
        title={T('messages.lockedTitle')}
        body={statut === 'restreint' ? T('messages.lockedRestricted') : T('messages.lockedGuest')}
        restricted={statut === 'restreint'}
        photo={GROUPE}
        atouts={[
          { icon: IconChat, title: T('messages.perk1'), sub: T('messages.perk1Sub') },
          { icon: IconUsers, title: T('messages.perk2'), sub: T('messages.perk2Sub') },
          { icon: IconInfo, title: T('messages.perk3'), sub: T('messages.perk3Sub') },
        ]}
      />
    </Page>
  );
}
