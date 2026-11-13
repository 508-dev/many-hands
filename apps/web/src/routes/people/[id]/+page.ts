import { collection, pb } from "$lib/pb";
import type { HelperStats, Skill, ThankYou, User } from "$lib/types";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ params }) => {
  const id = params.id;

  let user: User;
  try {
    user = await collection<User>("users").getOne(id);
  } catch {
    return {
      user: null as User | null,
      skills: [] as Skill[],
      thanks: [] as ThankYou[],
      stats: null as HelperStats | null,
    };
  }

  const [skills, thanks, stats] = await Promise.all([
    collection<Skill>("skills").getList(1, 500, {
      filter: pb.filter("user = {:id}", { id }),
      sort: "-created",
      expand: "user",
    }),
    collection<ThankYou>("thanks").getList(1, 100, {
      filter: pb.filter("helper = {:id}", { id }),
      sort: "-created",
      expand: "author",
    }),
    collection<HelperStats>("helper_stats")
      .getOne(id)
      .catch(() => null),
  ]);

  return { user, skills: skills.items, thanks: thanks.items, stats };
};
