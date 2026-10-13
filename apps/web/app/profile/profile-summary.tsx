import type { Ref } from "react";
import { SealCheckIcon } from "@phosphor-icons/react/dist/csr/SealCheck";
import { GraduationCapIcon } from "@phosphor-icons/react/dist/csr/GraduationCap";
import { BookOpenIcon } from "@phosphor-icons/react/dist/csr/BookOpen";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/csr/CalendarBlank";
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
}: {
  name: string;
  hometown?: string | null;
  bio: string;
  campus: string;
  major: string;
  graduationYear: number | null;
  verified?: boolean;
  headingRef?: Ref<HTMLHeadingElement>;
}) {
  return (
    <div className="profile-summary">
      <div className="profile-title-row">
        <h1 ref={headingRef} tabIndex={headingRef ? -1 : undefined}>
          {name}
        </h1>
        {verified && (
          <span className="profile-verified">
            <SealCheckIcon size={27} weight="fill" aria-hidden="true" />
            <span className="visually-hidden">UNC email verified</span>
          </span>
        )}
      </div>
      <dl className="profile-facts">
        <div>
          <GraduationCapIcon aria-hidden="true" />
          <dt>School:</dt>
          <dd>{campus}</dd>
        </div>
        {major && (
          <div>
            <BookOpenIcon aria-hidden="true" />
            <dt>Major:</dt>
            <dd>{major}</dd>
          </div>
        )}
        {graduationYear && (
          <div>
            <CalendarBlankIcon aria-hidden="true" />
            <dt>Class:</dt>
            <dd>Class of {graduationYear}</dd>
          </div>
        )}
        {hometown && (
          <div>
            <MapPinIcon aria-hidden="true" />
            <dt>Hometown:</dt>
            <dd>{hometown}</dd>
          </div>
        )}
      </dl>
      {bio && <p className="profile-bio">{bio}</p>}
    </div>
  );
}
