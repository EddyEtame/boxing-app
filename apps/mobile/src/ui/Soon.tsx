import { useT } from '@/i18n';
import { Card } from '@/ui/kit';
import { Body, Heading } from '@/ui/Text';
import { makeStyles, space } from '@/ui/theme';

/** Rubrique conservee, sans contenu invente. */
export function Bientot() {
  const T = useT();
  const s = useStyles();
  return (
    <Card>
      <Heading level="section">{T('soon.title')}</Heading>
      <Body tone="muted" style={s.body}>
        {T('soon.body')}
      </Body>
    </Card>
  );
}

const useStyles = makeStyles(() => ({
  body: { marginTop: space[2] },
}));
