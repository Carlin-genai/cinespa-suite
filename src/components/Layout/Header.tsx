import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const Header = () => {
  const { profile } = useAuth();

  const { data: organization } = useQuery({
    queryKey: ['organization', profile?.org_id],
    queryFn: async () => {
      if (!profile?.org_id) return null;
      
      const { data, error } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', profile.org_id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching organization:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!profile?.org_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (!organization?.name) return null;

  return (
    <div className="bg-background border-b border-border px-6 py-3">
      <div className="flex items-center">
        <h2 className="text-lg font-semibold text-foreground font-montserrat">
          {organization.name}
        </h2>
      </div>
    </div>
  );
};

export default Header;