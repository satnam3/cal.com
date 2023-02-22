import classNames from "classnames";
import MarkdownIt from "markdown-it";
import type { GetServerSidePropsContext } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";

import {
  sdkActionManager,
  useEmbedNonStylesConfig,
  useEmbedStyles,
  useIsEmbed,
} from "@calcom/embed-core/embed-iframe";
import { EventTypeDescriptionLazy as EventTypeDescription } from "@calcom/features/eventtypes/components";
import EmptyPage from "@calcom/features/eventtypes/components/EmptyPage";
import CustomBranding from "@calcom/lib/CustomBranding";
import defaultEvents, {
  getDynamicEventDescription,
  getGroupName,
  getUsernameList,
  getUsernameSlugLink,
} from "@calcom/lib/defaultEvents";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useTheme from "@calcom/lib/hooks/useTheme";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@calcom/lib/telemetry";
import prisma from "@calcom/prisma";
import { baseEventTypeSelect } from "@calcom/prisma/selects";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
import { HeadSeo, AvatarGroup, Avatar } from "@calcom/ui";
import { BadgeCheckIcon, FiArrowRight } from "@calcom/ui/components/icon";

import type { inferSSRProps } from "@lib/types/inferSSRProps";
import type { EmbedProps } from "@lib/withEmbedSsr";

import { ssrInit } from "@server/lib/ssr";

const md = new MarkdownIt("default", { html: true, breaks: true, linkify: true });

export default function User(props: inferSSRProps<typeof getServerSideProps> & EmbedProps) {
  const { users, profile, eventTypes, isDynamicGroup, dynamicNames, dynamicUsernames, isSingleUser } = props; 
  const [user] = users; //To be used when we only have a single user, not dynamic group
  useTheme(user.theme);
  const { t } = useLocale();
  const router = useRouter();

  const isBioEmpty = !user.bio || !user.bio.replace("<p><br></p>", "").length;

  const groupEventTypes = props.users.some((user) => !user.allowDynamicBooking) ? (
    <div className="space-y-6" data-testid="event-types">
        <div className="overflow-hidden rounded-sm border dark:border-gray-900">
          <div className="p-8 text-center text-gray-400 dark:text-white">
            <h2 className="font-cal mb-2 text-3xl text-gray-600 dark:text-white">{" " + t("unavailable")}</h2>
            <p className="mx-auto max-w-md">{t("user_dynamic_booking_disabled") as string}</p>
          </div>
        </div>
      </div>
    ) : (
      <ul className="space-y-3">
        {eventTypes.map((type, index) => (
          <li
            key={index}
            className="hover:border-brand group relative rounded-sm border-neutral-200 hover:bg-gray-50 dark:border-neutral-700 dark:bg-gray-50 dark:hover:border-neutral-600 mt-0">
            <Icon.FiArrowRight className="absolute right-3 top-3 h-4 w-4 text-black opacity-0 transition-opacity group-hover:opacity-100 dark:text-white mt-4 satnam" />
            <Link
             href={getUsernameSlugLink({ users: props.users, slug: type.slug })}
              className="flex justify-between px-6 py-4"
              data-testid="event-type-link">
                <div className="flex-shrink">
                  <p className="font-cal font-semibold text-neutral-700 dark:text-white">{type.title}</p>
                  <EventTypeDescription className="text-sm" eventType={type} />
                </div>
                <div className="mt-1 self-center">
                  <AvatarGroup
                    border="border-2 border-white"
                    truncateAfter={4}
                    className="flex flex-shrink-0"
                    size={10}
                    items={props.users.map((user) => ({
                      alt: user.name || "",
                      image: user.avatar || "",
                    }))}
                  />
                </div>
            </Link>
          </li>
        ))}
      </ul>
    );

  const isEmbed = useIsEmbed(props.isEmbed);
  const eventTypeListItemEmbedStyles = useEmbedStyles("eventTypeListItem");
  const shouldAlignCentrallyInEmbed = useEmbedNonStylesConfig("align") !== "left";
  const shouldAlignCentrally = !isEmbed || shouldAlignCentrallyInEmbed;
  const query = { ...router.query };
  delete query.user; // So it doesn't display in the Link (and make tests fail)
  //useExposePlanGlobally("PRO");
  const nameOrUsername = user.name || user.username || "";
  const telemetry = useTelemetry();

  useEffect(() => {
    if (top !== window) {
      //page_view will be collected automatically by _middleware.ts
      telemetry.event(telemetryEventTypes.embedView, collectPageParameters("/[user]"));
    }
  }, [telemetry, router.asPath]);
  const isEventListEmpty = eventTypes.length === 0;
  return (
    <>
      <HeadSeo
        title={isDynamicGroup ? dynamicNames.join(", ") : nameOrUsername}
        description={
          isDynamicGroup ? `Book events with ${dynamicUsernames.join(", ")}` : (user.bio as string) || ""
        }
        meeting={{
          title: isDynamicGroup ? "" : `${user.bio}`,
          profile: { name: `${profile.name}`, image: null },
          users: isDynamicGroup
            ? dynamicUsernames.map((username, index) => ({ username, name: dynamicNames[index] }))
            : [{ username: `${user.username}`, name: `${user.name}` }],
        }}
      />
      <CustomBranding lightVal={profile.brandColor} darkVal={profile.darkBrandColor} />

      <div
        className={classNames(
          shouldAlignCentrally ? "mx-auto" : "",
          isEmbed ? "max-w-3xl min-h-screen flex items-center" : "",
          " dark:shadow-gray-200"
        )}>
        <main
          className={classNames(
            shouldAlignCentrally ? "mx-auto w-full" : "",
            isEmbed
              ? " rounded-md border dark:bg-neutral-900 sm:dark:border-gray-600 bg-stone-900"
              : "",
            "max-w-3xl py-5 px-4"
          )}>
          <div className="mb-2 text-center">
            <img className="mx-auto h-12" src="/doodeo-logo.png" />
            <p className="text-neutral-500 dark:text-white mt-2">
              Book your private virtual live performance
            </p>
          </div>
          <div
           className="space-y-6" 
           data-testid="event-types">
            {user.away ? (
              <div className="overflow-hidden rounded-sm border dark:border-gray-900">
                <div className="p-8 text-center text-gray-400 dark:text-white">
                  <h2 className="font-cal mb-2 text-3xl text-gray-600 dark:text-white">
                    😴{" " + t("user_away")}
                  </h2>
                  <p className="mx-auto max-w-md">{t("user_away_description") as string}</p>
                </div>
              </div>
            ) : isDynamicGroup ? ( //When we deal with dynamic group (users > 1)
              groupEventTypes
            ) : (
              <>
                {eventTypes.map((type) => (
                  <div key={type.id} style={{ display: "flex", ...eventTypeListItemEmbedStyles }} className="hover:border-brand group relative rounded-sm border-neutral-200 hover:bg-darkgray-200 dark:border-neutral-700 dark:bg-gray-50 dark:hover:border-neutral-600 mt-0">
                    <FiArrowRight className="absolute right-3 top-3 h-4 w-4 text-black opacity-0 transition-opacity group-hover:opacity-100 dark:text-white mt-4 satnam" />
                    <Link
                      prefetch={false}
                      href={{
                        pathname: `/${user.username}/${type.slug}`,
                        query,
                      }}
                        onClick={async () => {
                          sdkActionManager?.fire("eventTypeSelected", {
                            eventType: type,
                          });
                        }}
                        className="block w-full px-6 py-4"
                        data-testid="event-type-link">
                        <h2 className="grow font-semibold text-neutral-700 dark:text-white">
                          {type.title}
                        </h2>
                        <EventTypeDescription eventType={type} />
                    </Link> 
                  </div>
                ))}

                
                <div className="message">
                  <div className="mbg_head">
                    
                    <span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="transparent"
                        stroke="#FFFFFF"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        data-testid="icon-check-circle"
                      >
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                    </span>

                
                    <h4>Money back guarantee</h4>
                    <a className="mbg_title">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                      </svg>
                    </a>
                    <div className="mbg_des">
                      If you pay on web by card, the amount goes into an escrow account and is only released 72 hours after the performance is done. 
                      <br /><br />
                      We will always provide a full refund if the musician doesn’t respond.
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          {isEventListEmpty && <EmptyPage name={user.name ?? "User"} />}
          {/*eventTypes.length === 0 && (
            <div className="overflow-hidden rounded-sm border dark:border-gray-900">
              <div className="p-8 text-center text-gray-400 dark:text-white">
                <h2 className="font-cal mb-2 text-3xl text-gray-600 dark:text-white">
                  {t("uh_oh") as string}
                </h2>
                <p className="mx-auto max-w-md">{t("no_event_types_have_been_setup") as string}</p>
              </div>
            </div>
          )*/}
        </main>
        <Toaster position="bottom-right" />
      </div>
    </>
  );
}
User.isThemeSupported = true;

const getEventTypesWithHiddenFromDB = async (userId: number) => {
  return (
    await prisma.eventType.findMany({
    where: {
      AND: [
        {
          teamId: null,
        },
        {
          OR: [
            {
              userId,
            },
            {
              users: {
                some: {
                  id: userId,
                },
              },
            },
          ],
        },
      ],
    },
    orderBy: [
      {
        position: "desc",
      },
      {
        id: "asc",
      },
    ],
    select: {
        ...baseEventTypeSelect,
        metadata: true,
      },
      //take: plan === UserPlan.FREE ? 1 : undefined,
    })
  ).map((eventType) => ({
    ...eventType,
    metadata: EventTypeMetaDataSchema.parse(eventType.metadata),
  }));
};

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);
  const crypto = await import("crypto");

  const usernameList = getUsernameList(context.query.user as string);
  const dataFetchStart = Date.now();
  const users = await prisma.user.findMany({
    where: {
      username: {
        in: usernameList,
      },
    },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      bio: true,
      brandColor: true,
      darkBrandColor: true,
      avatar: true,
      theme: true,
      plan: true,
      away: true,
      verified: true,
      allowDynamicBooking: true,
    },
  });

  if (!users.length) {
    return {
      notFound: true,
    } as {
      notFound: true;
    };
  }
  const isDynamicGroup = users.length > 1;

  if (isDynamicGroup) {
    // sort and be in the same order as usernameList so first user is the first user in the list
    users.sort((a, b) => {
      const aIndex = (a.username && usernameList.indexOf(a.username)) || 0;
      const bIndex = (b.username && usernameList.indexOf(b.username)) || 0;
      return aIndex - bIndex;
    });
  }

  const dynamicNames = isDynamicGroup
    ? users.map((user) => {
        return user.name || "";
      })
    : [];
  const [user] = users; //to be used when dealing with single user, not dynamic group

  const profile = isDynamicGroup
    ? {
        name: getGroupName(dynamicNames),
        image: null,
        theme: null,
        weekStart: "Sunday",
        brandColor: "",
        darkBrandColor: "",
        allowDynamicBooking: !users.some((user) => {
          return !user.allowDynamicBooking;
        }),
      }
    : {
        name: user.name || user.username,
        image: user.avatar,
        theme: user.theme,
        brandColor: user.brandColor,
        darkBrandColor: user.darkBrandColor,
      };
  const usersIds = users.map((user) => user.id);
  const credentials = await prisma.credential.findMany({
    where: {
      userId: {
        in: usersIds,
      },
    },
    select: {
      id: true,
      type: true,
      key: true,
    },
  });

  const web3Credentials = credentials.find((credential) => credential.type.includes("_web3"));

  const eventTypesWithHidden = isDynamicGroup ? [] : await getEventTypesWithHiddenFromDB(user.id, user.plan);
  const dataFetchEnd = Date.now();
  if (context.query.log === "1") {
    context.res.setHeader("X-Data-Fetch-Time", `${dataFetchEnd - dataFetchStart}ms`);
  }
  const eventTypesRaw = eventTypesWithHidden.filter((evt) => !evt.hidden);

  const eventTypes = eventTypesRaw.map((eventType) => ({
    ...eventType,
    metadata: EventTypeMetaDataSchema.parse(eventType.metadata || {}),
  }));

  const isSingleUser = users.length === 1;
  const dynamicUsernames = isDynamicGroup
    ? users.map((user) => {
        return user.username || "";
      })
    : [];

  return {
    props: {
      users,
      profile,
      user: {
        emailMd5: crypto.createHash("md5").update(user.email).digest("hex"),
      },
      eventTypes: isDynamicGroup
        ? defaultEvents.map((event) => {
            event.description = getDynamicEventDescription(dynamicUsernames, event.slug);
            return event;
          })
        : eventTypes,
      trpcState: ssr.dehydrate(),
      isDynamicGroup,
      dynamicNames,
      dynamicUsernames,
      isSingleUser,
    },
  };
};
