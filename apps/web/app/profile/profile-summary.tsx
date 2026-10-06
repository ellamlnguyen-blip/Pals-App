import type { ReactNode, Ref } from "react";
import { SealCheckIcon } from "@phosphor-icons/react/dist/csr/SealCheck";
import { MapPinIcon } from "@phosphor-icons/react/dist/csr/MapPin";

export function ProfileSummary({
  name,
  hometown,
  bio,
  campus,
  major,
  graduationYear,
  verified,
  headingRef,
  actions,
}: {
  name: string;
  hometown?: string | null;
  bio: string;
  campus: string;
  major: string;
  graduationYear: number | null;
  verified?: boolean;
  headingRef?: Ref<HTMLHeadingElement>;
  actions?: ReactNode;
}) {
  return (
    <>
      <div className="profile-title-row">
        <h1 ref={headingRef} tabIndex={headingRef ? -1 : undefined}>
          {name}
        </h1>
        {verified && (
          <span className="profile-verified">
            <SealCheckIcon size={25} weight="fill" aria-hidden="true" /> UNC
            email verified
          </span>
        )}
      </div>
      {hometown && (
        <p className="profile-hometown">
          <MapPinIcon size={22} weight="fill" aria-hidden="true" />
          <span>From {hometown}</span>
        </p>
      )}
      <p className="profile-bio">{bio}</p>
      <dl className="profile-facts">
        <div>
          <dt>University</dt>
          <dd>{campus}</dd>
        </div>
        <div>
          <dt>Major</dt>
          <dd>{major}</dd>
        </div>
        <div>
          <dt>Graduation</dt>
          <dd>
            {graduationYear
              ? `Class of ${graduationYear}`
              : "Add your class year"}
          </dd>
        </div>
      </dl>
      {actions && <div className="profile-main-actions">{actions}</div>}
    </>
  );
}
